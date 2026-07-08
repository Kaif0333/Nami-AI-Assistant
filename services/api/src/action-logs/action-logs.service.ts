import {
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  Optional
} from "@nestjs/common";
import type { ActionLog as ActionLogRecord, Prisma } from "@prisma/client";
import { randomUUID } from "node:crypto";

import { sanitizePreview } from "../common/sanitize-preview";
import { DatabaseService } from "../database/database.service";
import { SafeActionPolicyService } from "../safety/safe-action-policy.service";
import type { RiskLevel } from "../safety/safe-action-policy.types";
import {
  ActionLog,
  ActionLogListFilters,
  ActionLogStatus,
  CreateActionLogInput
} from "./action-log.types";

@Injectable()
export class ActionLogsService {
  private readonly logger = new Logger(ActionLogsService.name);
  private readonly logs = new Map<string, ActionLog>();

  constructor(
    @Inject(SafeActionPolicyService)
    private readonly policy: SafeActionPolicyService,
    @Optional()
    @Inject(DatabaseService)
    private readonly database?: DatabaseService
  ) {}

  async createActionLog(input: CreateActionLogInput) {
    const actionType = this.policy.normalizeActionType(input.actionType);
    const now = new Date();
    const status = input.status ?? "planned";
    const log: ActionLog = {
      id: randomUUID(),
      commandId: input.commandId ?? null,
      approvalId: input.approvalId ?? null,
      actionType,
      summary: input.summary.trim(),
      status,
      riskLevel: input.riskLevel ?? this.policy.classifyRiskLevel(actionType),
      inputPreview: sanitizePreview(input.inputPreview ?? {}),
      outputPreview: sanitizePreview(input.outputPreview ?? {}),
      errorMessage: input.errorMessage?.trim() || null,
      createdAt: now.toISOString(),
      startedAt: status === "running" ? now.toISOString() : null,
      completedAt: this.isTerminalStatus(status) ? now.toISOString() : null,
      metadata: sanitizePreview({
        persistence: this.database?.enabled
          ? "database"
          : "in_memory_fallback_no_database_url",
        ...input.metadata
      })
    };

    if (this.database?.client) {
      const saved = await this.database.client.actionLog.create({
        data: {
          id: log.id,
          commandId: log.commandId,
          approvalId: log.approvalId,
          actionType: log.actionType,
          summary: log.summary,
          status: log.status,
          riskLevel: log.riskLevel,
          inputPreview: log.inputPreview as Prisma.InputJsonObject,
          outputPreview: log.outputPreview as Prisma.InputJsonObject,
          errorMessage: log.errorMessage,
          createdAt: now,
          startedAt: log.startedAt ? new Date(log.startedAt) : undefined,
          completedAt: log.completedAt ? new Date(log.completedAt) : undefined,
          metadata: log.metadata as Prisma.InputJsonObject
        }
      });

      this.logger.log(
        `action_log.created id=${saved.id} actionType=${saved.actionType} status=${saved.status}`
      );

      return this.toActionLog(saved);
    }

    this.logs.set(log.id, log);
    this.logger.log(
      `action_log.created id=${log.id} actionType=${log.actionType} status=${log.status}`
    );

    return log;
  }

  async getActionLog(id: string) {
    if (this.database?.client) {
      const log = await this.database.client.actionLog.findUnique({
        where: { id }
      });

      if (!log) {
        throw this.notFound(id);
      }

      return this.toActionLog(log);
    }

    const log = this.logs.get(id);

    if (!log) {
      throw this.notFound(id);
    }

    return log;
  }

  async listActionLogs(filters: ActionLogListFilters = {}) {
    if (this.database?.client) {
      const logs = await this.database.client.actionLog.findMany({
        where: {
          status: filters.status,
          riskLevel: filters.riskLevel,
          actionType: filters.actionType
            ? this.policy.normalizeActionType(filters.actionType)
            : undefined
        },
        orderBy: { createdAt: "desc" }
      });

      return logs.map((log) => this.toActionLog(log));
    }

    return Array.from(this.logs.values())
      .filter((log) => (filters.status ? log.status === filters.status : true))
      .filter((log) =>
        filters.riskLevel ? log.riskLevel === filters.riskLevel : true
      )
      .filter((log) =>
        filters.actionType
          ? log.actionType === this.policy.normalizeActionType(filters.actionType)
          : true
      )
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  }

  async markApprovalLogs(approvalId: string, status: ActionLogStatus) {
    if (this.database?.client) {
      await this.database.client.actionLog.updateMany({
        where: { approvalId },
        data: {
          status,
          completedAt: this.isTerminalStatus(status) ? new Date() : undefined
        }
      });

      const updatedLogs = await this.database.client.actionLog.findMany({
        where: { approvalId },
        orderBy: { createdAt: "desc" }
      });

      return updatedLogs.map((log) => this.toActionLog(log));
    }

    const updatedLogs: ActionLog[] = [];

    for (const log of this.logs.values()) {
      if (log.approvalId !== approvalId) {
        continue;
      }

      updatedLogs.push(await this.updateActionLog(log.id, { status }));
    }

    return updatedLogs;
  }

  async updateActionLog(id: string, updates: Partial<ActionLog>) {
    const log = await this.getActionLog(id);
    const now = new Date().toISOString();
    const status = updates.status ?? log.status;
    const updated: ActionLog = {
      ...log,
      ...updates,
      inputPreview: updates.inputPreview
        ? sanitizePreview(updates.inputPreview)
        : log.inputPreview,
      outputPreview: updates.outputPreview
        ? sanitizePreview(updates.outputPreview)
        : log.outputPreview,
      metadata: updates.metadata ? sanitizePreview(updates.metadata) : log.metadata,
      startedAt:
        status === "running" && !log.startedAt ? now : updates.startedAt ?? log.startedAt,
      completedAt: this.isTerminalStatus(status)
        ? now
        : updates.completedAt ?? log.completedAt
    };

    if (this.database?.client) {
      const saved = await this.database.client.actionLog.update({
        where: { id },
        data: {
          commandId: updated.commandId,
          approvalId: updated.approvalId,
          actionType: updated.actionType,
          summary: updated.summary,
          status: updated.status,
          riskLevel: updated.riskLevel,
          inputPreview: updated.inputPreview as Prisma.InputJsonObject,
          outputPreview: updated.outputPreview as Prisma.InputJsonObject,
          errorMessage: updated.errorMessage,
          startedAt: updated.startedAt ? new Date(updated.startedAt) : null,
          completedAt: updated.completedAt ? new Date(updated.completedAt) : null,
          metadata: updated.metadata as Prisma.InputJsonObject
        }
      });

      return this.toActionLog(saved);
    }

    this.logs.set(id, updated);
    return updated;
  }

  private isTerminalStatus(status?: ActionLogStatus) {
    return Boolean(
      status &&
        ["completed", "failed", "cancelled", "blocked", "rejected"].includes(
          status
      )
    );
  }

  private toActionLog(record: ActionLogRecord): ActionLog {
    return {
      id: record.id,
      commandId: record.commandId,
      approvalId: record.approvalId,
      actionType: record.actionType,
      summary: record.summary,
      status: record.status,
      riskLevel: record.riskLevel as RiskLevel,
      inputPreview: asRecord(record.inputPreview),
      outputPreview: asRecord(record.outputPreview),
      errorMessage: record.errorMessage,
      createdAt: record.createdAt.toISOString(),
      startedAt: record.startedAt?.toISOString() ?? null,
      completedAt: record.completedAt?.toISOString() ?? null,
      metadata: asRecord(record.metadata)
    };
  }

  private notFound(id: string) {
    return new NotFoundException({
      code: "ACTION_LOG_NOT_FOUND",
      message: "Action log was not found.",
      details: { id }
    });
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
}
