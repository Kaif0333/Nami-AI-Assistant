import type { RiskLevel } from "../safety/safe-action-policy.types";

export const actionLogStatuses = [
  "planned",
  "approval_required",
  "approved",
  "rejected",
  "running",
  "completed",
  "failed",
  "cancelled",
  "blocked"
] as const;

export type ActionLogStatus = (typeof actionLogStatuses)[number];

export type ActionLog = {
  id: string;
  commandId: string | null;
  approvalId: string | null;
  actionType: string;
  summary: string;
  status: ActionLogStatus;
  riskLevel: RiskLevel;
  inputPreview: Record<string, unknown>;
  outputPreview: Record<string, unknown>;
  errorMessage: string | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  metadata: Record<string, unknown>;
};

export type CreateActionLogInput = {
  commandId?: string | null;
  approvalId?: string | null;
  actionType: string;
  summary: string;
  status?: ActionLogStatus;
  riskLevel?: RiskLevel;
  inputPreview?: Record<string, unknown>;
  outputPreview?: Record<string, unknown>;
  errorMessage?: string | null;
  metadata?: Record<string, unknown>;
};

export type ActionLogListFilters = {
  status?: ActionLogStatus;
  riskLevel?: RiskLevel;
  actionType?: string;
};
