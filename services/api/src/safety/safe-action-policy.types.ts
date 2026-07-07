export const riskLevels = ["low", "medium", "high", "blocked"] as const;
export type RiskLevel = (typeof riskLevels)[number];

export const approvalRequiredActionTypes = [
  "send_email",
  "send_message",
  "submit_form",
  "submit_job_application",
  "delete_file",
  "modify_important_file",
  "run_risky_command",
  "install_global_package",
  "push_to_github",
  "deploy_app",
  "share_personal_data",
  "make_payment",
  "change_system_settings",
  "start_screen_control",
  "record_meeting",
  "trigger_external_send_workflow",
  "demo_send_email"
] as const;

export const blockedActionTypes = [
  "bypass_captcha",
  "steal_credentials",
  "secretly_record",
  "disable_approval_system",
  "interview_impersonation",
  "exfiltrate_secrets"
] as const;

export type ApprovalRequiredActionType =
  (typeof approvalRequiredActionTypes)[number];
export type BlockedActionType = (typeof blockedActionTypes)[number];

export type RiskClassification = {
  actionType: string;
  riskLevel: RiskLevel;
  approvalRequired: boolean;
  blocked: boolean;
  reason: string;
};

export type CommandActionDetection = RiskClassification & {
  matched: boolean;
};
