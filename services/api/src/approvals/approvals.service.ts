import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  Optional
} from "@nestjs/common";
import type {
  ApprovalRequest as ApprovalRequestRecord,
  Prisma
} from "@prisma/client";
import { randomUUID } from "node:crypto";

import { sanitizePreview } from "../common/sanitize-preview";
import { DatabaseService } from "../database/database.service";
import { SafeActionPolicyService } from "../safety/safe-action-policy.service";
import type { RiskLevel } from "../safety/safe-action-policy.types";
import {
  ApprovalListFilters,
  ApprovalRequest,
  CreateApprovalRequestInput
} from "./approval.types";

@Injectable()
export class ApprovalsService {
  private readonly logger = new Logger(ApprovalsService.name);
  private readonly requests = new Map<string, ApprovalRequest>();

  constructor(
    @Inject(SafeActionPolicyService)
    private readonly policy: SafeActionPolicyService,
    @Optional()
    @Inject(DatabaseService)
    private readonly database?: DatabaseService
  ) {}

  async createApprovalRequest(input: CreateApprovalRequestInput) {
    const actionType = this.policy.normalizeActionType(input.actionType);
    const classification = this.policy.classifyAction(actionType);
    const riskLevel = input.riskLevel ?? classification.riskLevel;

    if (classification.blocked || riskLevel === "blocked") {
      throw new BadRequestException({
        code: "BLOCKED_ACTION",
        message: "This action is blocked by Nami safety policy.",
        details: { actionType }
      });
    }

    const now = new Date();
    const request: ApprovalRequest = {
      id: randomUUID(),
      actionType,
      summary: input.summary.trim(),
      description: input.description?.trim() ?? "",
      payloadPreview: sanitizePreview(input.payloadPreview ?? {}),
      riskLevel,
      status: "pending",
      requestedBy: input.requestedBy?.trim() || "system",
      createdAt: now.toISOString(),
      approvedAt: null,
      rejectedAt: null,
      completedAt: null,
      errorMessage: null,
      metadata: sanitizePreview({
        persistence: this.database?.enabled
          ? "database"
          : "in_memory_fallback_no_database_url",
        ...input.metadata
      })
    };

    if (this.database?.client) {
      const saved = await this.database.client.approvalRequest.create({
        data: {
          id: request.id,
          actionType: request.actionType,
          summary: request.summary,
          description: request.description,
          payloadPreview: request.payloadPreview as Prisma.InputJsonObject,
          riskLevel: request.riskLevel,
          status: request.status,
          requestedBy: request.requestedBy,
          createdAt: now,
          metadata: request.metadata as Prisma.InputJsonObject
        }
      });

      this.logger.log(
        `approval.created id=${saved.id} actionType=${saved.actionType} risk=${saved.riskLevel}`
      );

      return this.toApprovalRequest(saved);
    }

    this.requests.set(request.id, request);
    this.logger.log(
      `approval.created id=${request.id} actionType=${request.actionType} risk=${request.riskLevel}`
    );

    return request;
  }

  async getApprovalRequest(id: string) {
    if (this.database?.client) {
      const request = await this.database.client.approvalRequest.findUnique({
        where: { id }
      });

      if (!request) {
        throw this.notFound(id);
      }

      return this.toApprovalRequest(request);
    }

    const request = this.requests.get(id);

    if (!request) {
      throw this.notFound(id);
    }

    return request;
  }

  async listApprovalRequests(filters: ApprovalListFilters = {}) {
    if (this.database?.client) {
      const approvals = await this.database.client.approvalRequest.findMany({
        where: {
          status: filters.status,
          riskLevel: filters.riskLevel,
          actionType: filters.actionType
            ? this.policy.normalizeActionType(filters.actionType)
            : undefined
        },
        orderBy: { createdAt: "desc" }
      });

      return approvals.map((approval) => this.toApprovalRequest(approval));
    }

    return Array.from(this.requests.values())
      .filter((request) =>
        filters.status ? request.status === filters.status : true
      )
      .filter((request) =>
        filters.riskLevel ? request.riskLevel === filters.riskLevel : true
      )
      .filter((request) =>
        filters.actionType
          ? request.actionType === this.policy.normalizeActionType(filters.actionType)
          : true
      )
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  }

  async approveRequest(id: string, metadata: Record<string, unknown> = {}) {
    const request = await this.getApprovalRequest(id);

    if (request.status !== "pending") {
      throw new BadRequestException({
        code: "APPROVAL_NOT_PENDING",
        message: "Only pending approval requests can be approved.",
        details: { id, status: request.status }
      });
    }

    const updated = await this.updateRequest(id, {
      status: "approved",
      approvedAt: new Date().toISOString(),
      metadata: sanitizePreview({ ...request.metadata, ...metadata })
    });

    this.logger.log(`approval.approved id=${id}`);
    return updated;
  }

  rejectRequest(
    id: string,
    reason?: string,
    metadata: Record<string, unknown> = {}
  ) {
    return this.rejectRequestInternal(id, reason, metadata);
  }

  async markRequestCompleted(id: string, metadata: Record<string, unknown> = {}) {
    const request = await this.getApprovalRequest(id);

    return this.updateRequest(id, {
      status: "completed",
      completedAt: new Date().toISOString(),
      metadata: sanitizePreview({ ...request.metadata, ...metadata })
    });
  }

  async markRequestFailed(id: string, errorMessage: string) {
    return this.updateRequest(id, {
      status: "failed",
      completedAt: new Date().toISOString(),
      errorMessage: errorMessage.trim()
    });
  }

  requiresApproval(actionType: string) {
    return this.policy.requiresApproval(actionType);
  }

  classifyRiskLevel(actionType: string): RiskLevel {
    return this.policy.classifyRiskLevel(actionType);
  }

  private async rejectRequestInternal(
    id: string,
    reason?: string,
    metadata: Record<string, unknown> = {}
  ) {
    const request = await this.getApprovalRequest(id);

    if (request.status !== "pending") {
      throw new BadRequestException({
        code: "APPROVAL_NOT_PENDING",
        message: "Only pending approval requests can be rejected.",
        details: { id, status: request.status }
      });
    }

    const updated = await this.updateRequest(id, {
      status: "rejected",
      rejectedAt: new Date().toISOString(),
      errorMessage: reason?.trim() || null,
      metadata: sanitizePreview({ ...request.metadata, ...metadata })
    });

    this.logger.log(`approval.rejected id=${id}`);
    return updated;
  }

  private async updateRequest(id: string, updates: Partial<ApprovalRequest>) {
    const request = await this.getApprovalRequest(id);
    const updated = {
      ...request,
      ...updates
    };

    if (this.database?.client) {
      const saved = await this.database.client.approvalRequest.update({
        where: { id },
        data: {
          status: updated.status,
          approvedAt: updates.approvedAt ? new Date(updates.approvedAt) : undefined,
          rejectedAt: updates.rejectedAt ? new Date(updates.rejectedAt) : undefined,
          completedAt: updates.completedAt
            ? new Date(updates.completedAt)
            : undefined,
          errorMessage: updates.errorMessage,
          metadata: updates.metadata as Prisma.InputJsonObject | undefined
        }
      });

      return this.toApprovalRequest(saved);
    }

    this.requests.set(id, updated);
    return updated;
  }

  private toApprovalRequest(record: ApprovalRequestRecord): ApprovalRequest {
    return {
      id: record.id,
      actionType: record.actionType,
      summary: record.summary,
      description: record.description,
      payloadPreview: asRecord(record.payloadPreview),
      riskLevel: record.riskLevel as RiskLevel,
      status: record.status,
      requestedBy: record.requestedBy,
      createdAt: record.createdAt.toISOString(),
      approvedAt: record.approvedAt?.toISOString() ?? null,
      rejectedAt: record.rejectedAt?.toISOString() ?? null,
      completedAt: record.completedAt?.toISOString() ?? null,
      errorMessage: record.errorMessage,
      metadata: asRecord(record.metadata)
    };
  }

  private notFound(id: string) {
    return new NotFoundException({
      code: "APPROVAL_NOT_FOUND",
      message: "Approval request was not found.",
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
