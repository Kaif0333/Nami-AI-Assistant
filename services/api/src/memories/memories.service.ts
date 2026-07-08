import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  Optional
} from "@nestjs/common";
import type { Memory as MemoryRow, Prisma } from "@prisma/client";
import { randomUUID } from "node:crypto";

import {
  containsSecretLikeValue,
  sanitizePreview
} from "../common/sanitize-preview";
import { DatabaseService } from "../database/database.service";
import {
  CreateMemoryInput,
  MemoryListFilters,
  MemoryRecord,
  MemoryVectorStatus,
  UpdateMemoryInput
} from "./memory.types";

@Injectable()
export class MemoriesService {
  private readonly logger = new Logger(MemoriesService.name);
  private readonly memories = new Map<string, MemoryRecord>();

  constructor(
    @Optional()
    @Inject(DatabaseService)
    private readonly database?: DatabaseService
  ) {}

  async createMemory(input: CreateMemoryInput) {
    this.assertSafeMemoryInput(input);

    const now = new Date();
    const memory: MemoryRecord = {
      id: randomUUID(),
      type: input.type,
      title: input.title.trim(),
      content: input.content.trim(),
      tags: normalizeTags(input.tags),
      source: input.source?.trim() || "manual",
      sensitivity: input.sensitivity ?? "personal",
      status: "active",
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      metadata: sanitizePreview({
        persistence: this.database?.enabled
          ? "database"
          : "in_memory_fallback_no_database_url",
        ...input.metadata
      }),
      hasEmbedding: false
    };

    if (this.database?.client) {
      const saved = await this.database.client.memory.create({
        data: {
          id: memory.id,
          type: memory.type,
          title: memory.title,
          content: memory.content,
          tags: memory.tags,
          source: memory.source,
          sensitivity: memory.sensitivity,
          status: memory.status,
          metadata: memory.metadata as Prisma.InputJsonObject,
          createdAt: now,
          updatedAt: now
        },
        include: { embeddings: { select: { id: true }, take: 1 } }
      });

      this.logger.log(`memory.created id=${saved.id} type=${saved.type}`);
      return this.toMemoryRecord(saved);
    }

    this.memories.set(memory.id, memory);
    this.logger.log(`memory.created id=${memory.id} type=${memory.type}`);
    return memory;
  }

  async getMemory(id: string) {
    if (this.database?.client) {
      const memory = await this.database.client.memory.findUnique({
        where: { id },
        include: { embeddings: { select: { id: true }, take: 1 } }
      });

      if (!memory) {
        throw this.notFound(id);
      }

      return this.toMemoryRecord(memory);
    }

    const memory = this.memories.get(id);

    if (!memory) {
      throw this.notFound(id);
    }

    return memory;
  }

  async listMemories(filters: MemoryListFilters = {}) {
    if (this.database?.client) {
      const where = this.buildMemoryWhere(filters);
      const memories = await this.database.client.memory.findMany({
        where,
        include: { embeddings: { select: { id: true }, take: 1 } },
        orderBy: { updatedAt: "desc" },
        take: 100
      });

      return memories.map((memory) => this.toMemoryRecord(memory));
    }

    const query = filters.query?.trim().toLowerCase();
    const tag = normalizeTag(filters.tag);

    return Array.from(this.memories.values())
      .filter((memory) => (filters.status ? memory.status === filters.status : true))
      .filter((memory) => (filters.type ? memory.type === filters.type : true))
      .filter((memory) =>
        filters.sensitivity ? memory.sensitivity === filters.sensitivity : true
      )
      .filter((memory) => (tag ? memory.tags.includes(tag) : true))
      .filter((memory) => {
        if (!query) {
          return true;
        }

        return [memory.title, memory.content, memory.source, ...memory.tags]
          .join(" ")
          .toLowerCase()
          .includes(query);
      })
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  }

  async updateMemory(id: string, input: UpdateMemoryInput) {
    const current = await this.getMemory(id);
    const nextInput = {
      ...current,
      ...input,
      tags: input.tags ?? current.tags
    };

    this.assertSafeMemoryInput(nextInput);

    const updated: MemoryRecord = {
      ...current,
      type: input.type ?? current.type,
      title: input.title?.trim() ?? current.title,
      content: input.content?.trim() ?? current.content,
      tags: input.tags ? normalizeTags(input.tags) : current.tags,
      source: input.source?.trim() ?? current.source,
      sensitivity: input.sensitivity ?? current.sensitivity,
      status: input.status ?? current.status,
      updatedAt: new Date().toISOString(),
      metadata: input.metadata
        ? sanitizePreview({ ...current.metadata, ...input.metadata })
        : current.metadata
    };

    if (this.database?.client) {
      const saved = await this.database.client.memory.update({
        where: { id },
        data: {
          type: updated.type,
          title: updated.title,
          content: updated.content,
          tags: updated.tags,
          source: updated.source,
          sensitivity: updated.sensitivity,
          status: updated.status,
          metadata: updated.metadata as Prisma.InputJsonObject
        },
        include: { embeddings: { select: { id: true }, take: 1 } }
      });

      this.logger.log(`memory.updated id=${saved.id} status=${saved.status}`);
      return this.toMemoryRecord(saved);
    }

    this.memories.set(id, updated);
    this.logger.log(`memory.updated id=${id} status=${updated.status}`);
    return updated;
  }

  async disableMemory(id: string) {
    return this.updateMemory(id, { status: "disabled" });
  }

  async deleteMemory(id: string) {
    const memory = await this.getMemory(id);

    if (this.database?.client) {
      await this.database.client.memory.delete({ where: { id } });
      this.logger.log(`memory.deleted id=${id}`);
      return memory;
    }

    this.memories.delete(id);
    this.logger.log(`memory.deleted id=${id}`);
    return memory;
  }

  getVectorStatus(): MemoryVectorStatus {
    const embeddingModelConfigured = Boolean(
      process.env.MEMORY_EMBEDDING_MODEL?.trim()
    );

    return {
      databaseConfigured: Boolean(this.database?.enabled),
      pgvectorSchemaReady: true,
      embeddingModelConfigured,
      semanticSearchEnabled: false,
      message:
        "Semantic memory schema is pgvector-ready. Embedding generation and vector retrieval stay disabled until a real embedding provider is configured."
    };
  }

  private buildMemoryWhere(filters: MemoryListFilters): Prisma.MemoryWhereInput {
    const query = filters.query?.trim();
    const tag = normalizeTag(filters.tag);

    return {
      status: filters.status,
      type: filters.type,
      sensitivity: filters.sensitivity,
      tags: tag ? { has: tag } : undefined,
      OR: query
        ? [
            { title: { contains: query, mode: "insensitive" } },
            { content: { contains: query, mode: "insensitive" } },
            { source: { contains: query, mode: "insensitive" } }
          ]
        : undefined
    };
  }

  private assertSafeMemoryInput(input: {
    title?: string;
    content?: string;
    source?: string;
    metadata?: Record<string, unknown>;
  }) {
    if (
      containsSecretLikeValue({
        title: input.title,
        content: input.content,
        source: input.source,
        metadata: input.metadata
      })
    ) {
      throw new BadRequestException({
        code: "MEMORY_SECRET_REJECTED",
        message: "Nami will not store secrets in memory.",
        details: {}
      });
    }
  }

  private toMemoryRecord(
    row: MemoryRow & { embeddings?: Array<{ id: string }> }
  ): MemoryRecord {
    return {
      id: row.id,
      type: row.type,
      title: row.title,
      content: row.content,
      tags: row.tags,
      source: row.source,
      sensitivity: row.sensitivity,
      status: row.status,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      metadata: asRecord(row.metadata),
      hasEmbedding: Boolean(row.embeddings?.length)
    };
  }

  private notFound(id: string) {
    return new NotFoundException({
      code: "MEMORY_NOT_FOUND",
      message: "Memory was not found.",
      details: { id }
    });
  }
}

function normalizeTags(tags?: string[]) {
  return Array.from(
    new Set(
      (tags ?? [])
        .map((tag) => normalizeTag(tag))
        .filter((tag): tag is string => Boolean(tag))
    )
  );
}

function normalizeTag(tag?: string) {
  return tag?.trim().toLowerCase().replaceAll(/\s+/g, "-") || null;
}

function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
}
