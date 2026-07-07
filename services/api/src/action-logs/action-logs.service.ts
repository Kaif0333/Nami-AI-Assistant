import { Inject, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { randomUUID } from "node:crypto";

import { sanitizePreview } from "../common/sanitize-preview";
import { SafeActionPolicyService } from "../safety/safe-action-policy.service";
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
    private readonly policy: SafeActionPolicyService
  ) {}

  createActionLog(input: CreateActionLogInput) {
    const actionType = this.policy.normalizeActionType(input.actionType);
    const now = new Date().toISOString();
    const log: ActionLog = {
      id: randomUUID(),
      commandId: input.commandId ?? null,
      approvalId: input.approvalId ?? null,
      actionType,
      summary: input.summary.trim(),
      status: input.status ?? "planned",
      riskLevel: input.riskLevel ?? this.policy.classifyRiskLevel(actionType),
      inputPreview: sanitizePreview(input.inputPreview ?? {}),
      outputPreview: sanitizePreview(input.outputPreview ?? {}),
      errorMessage: input.errorMessage?.trim() || null,
      createdAt: now,
      startedAt: input.status === "running" ? now : null,
      completedAt: this.isTerminalStatus(input.status) ? now : null,
      metadata: sanitizePreview({
        persistence: "in_memory_until_database_phase",
        ...input.metadata
      })
    };

    this.logs.set(log.id, log);
    this.logger.log(
      `action_log.created id=${log.id} actionType=${log.actionType} status=${log.status}`
    );

    return log;
  }

  getActionLog(id: string) {
    const log = this.logs.get(id);

    if (!log) {
      throw new NotFoundException({
        code: "ACTION_LOG_NOT_FOUND",
        message: "Action log was not found.",
        details: { id }
      });
    }

    return log;
  }

  listActionLogs(filters: ActionLogListFilters = {}) {
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

  markApprovalLogs(approvalId: string, status: ActionLogStatus) {
    const updatedLogs: ActionLog[] = [];

    for (const log of this.logs.values()) {
      if (log.approvalId !== approvalId) {
        continue;
      }

      updatedLogs.push(this.updateActionLog(log.id, { status }));
    }

    return updatedLogs;
  }

  updateActionLog(id: string, updates: Partial<ActionLog>) {
    const log = this.getActionLog(id);
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
}
