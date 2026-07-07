import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException
} from "@nestjs/common";
import { randomUUID } from "node:crypto";

import { sanitizePreview } from "../common/sanitize-preview";
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
    private readonly policy: SafeActionPolicyService
  ) {}

  createApprovalRequest(input: CreateApprovalRequestInput) {
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

    const now = new Date().toISOString();
    const request: ApprovalRequest = {
      id: randomUUID(),
      actionType,
      summary: input.summary.trim(),
      description: input.description?.trim() ?? "",
      payloadPreview: sanitizePreview(input.payloadPreview ?? {}),
      riskLevel,
      status: "pending",
      requestedBy: input.requestedBy?.trim() || "system",
      createdAt: now,
      approvedAt: null,
      rejectedAt: null,
      completedAt: null,
      errorMessage: null,
      metadata: sanitizePreview({
        persistence: "in_memory_until_database_phase",
        ...input.metadata
      })
    };

    this.requests.set(request.id, request);
    this.logger.log(
      `approval.created id=${request.id} actionType=${request.actionType} risk=${request.riskLevel}`
    );

    return request;
  }

  getApprovalRequest(id: string) {
    const request = this.requests.get(id);

    if (!request) {
      throw new NotFoundException({
        code: "APPROVAL_NOT_FOUND",
        message: "Approval request was not found.",
        details: { id }
      });
    }

    return request;
  }

  listApprovalRequests(filters: ApprovalListFilters = {}) {
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

  approveRequest(id: string, metadata: Record<string, unknown> = {}) {
    const request = this.getApprovalRequest(id);

    if (request.status !== "pending") {
      throw new BadRequestException({
        code: "APPROVAL_NOT_PENDING",
        message: "Only pending approval requests can be approved.",
        details: { id, status: request.status }
      });
    }

    const updated = this.updateRequest(id, {
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
    const request = this.getApprovalRequest(id);

    if (request.status !== "pending") {
      throw new BadRequestException({
        code: "APPROVAL_NOT_PENDING",
        message: "Only pending approval requests can be rejected.",
        details: { id, status: request.status }
      });
    }

    const updated = this.updateRequest(id, {
      status: "rejected",
      rejectedAt: new Date().toISOString(),
      errorMessage: reason?.trim() || null,
      metadata: sanitizePreview({ ...request.metadata, ...metadata })
    });

    this.logger.log(`approval.rejected id=${id}`);
    return updated;
  }

  markRequestCompleted(id: string, metadata: Record<string, unknown> = {}) {
    const request = this.getApprovalRequest(id);

    return this.updateRequest(id, {
      status: "completed",
      completedAt: new Date().toISOString(),
      metadata: sanitizePreview({ ...request.metadata, ...metadata })
    });
  }

  markRequestFailed(id: string, errorMessage: string) {
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

  private updateRequest(id: string, updates: Partial<ApprovalRequest>) {
    const request = this.getApprovalRequest(id);
    const updated = {
      ...request,
      ...updates
    };

    this.requests.set(id, updated);
    return updated;
  }
}
