import type { RiskLevel } from "../safety/safe-action-policy.types";

export const approvalStatuses = [
  "pending",
  "approved",
  "rejected",
  "expired",
  "completed",
  "failed",
  "cancelled"
] as const;

export type ApprovalStatus = (typeof approvalStatuses)[number];

export type ApprovalRequest = {
  id: string;
  actionType: string;
  summary: string;
  description: string;
  payloadPreview: Record<string, unknown>;
  riskLevel: RiskLevel;
  status: ApprovalStatus;
  requestedBy: string;
  createdAt: string;
  approvedAt: string | null;
  rejectedAt: string | null;
  completedAt: string | null;
  errorMessage: string | null;
  metadata: Record<string, unknown>;
};

export type CreateApprovalRequestInput = {
  actionType: string;
  summary: string;
  description?: string;
  payloadPreview?: Record<string, unknown>;
  riskLevel?: RiskLevel;
  requestedBy?: string;
  metadata?: Record<string, unknown>;
};

export type ApprovalListFilters = {
  status?: ApprovalStatus;
  riskLevel?: RiskLevel;
  actionType?: string;
};
