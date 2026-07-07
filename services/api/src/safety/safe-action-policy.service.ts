import { Injectable } from "@nestjs/common";

import {
  approvalRequiredActionTypes,
  blockedActionTypes,
  CommandActionDetection,
  RiskClassification,
  RiskLevel
} from "./safe-action-policy.types";

const approvalRequiredActions = new Set<string>(approvalRequiredActionTypes);
const blockedActions = new Set<string>(blockedActionTypes);

const highRiskActions = new Set<string>([
  ...approvalRequiredActionTypes,
  "schedule_meeting_invite"
]);

const mediumRiskActions = new Set<string>([
  "draft_email",
  "fill_form",
  "create_calendar_draft",
  "generate_resume",
  "trigger_safe_n8n_workflow"
]);

type CommandPattern = {
  actionType: string;
  patterns: RegExp[];
};

const commandPatterns: CommandPattern[] = [
  {
    actionType: "send_email",
    patterns: [/\bsend\s+(an?\s+)?email\b/i, /\bemail\s+.+\b(to|about)\b/i]
  },
  {
    actionType: "send_message",
    patterns: [/\bsend\s+(a\s+)?message\b/i, /\btext\s+.+\b(on|to)\b/i]
  },
  {
    actionType: "submit_form",
    patterns: [/\bsubmit\s+(this\s+)?form\b/i]
  },
  {
    actionType: "submit_job_application",
    patterns: [/\bsubmit\s+.+\bjob application\b/i, /\bapply\s+to\s+.+\bjob\b/i]
  },
  {
    actionType: "delete_file",
    patterns: [/\bdelete\s+(this\s+)?file\b/i, /\bremove\s+.+\bfile\b/i]
  },
  {
    actionType: "push_to_github",
    patterns: [/\bpush\s+(it|this|changes)?\s*(to\s+)?github\b/i, /\bgit\s+push\b/i]
  },
  {
    actionType: "deploy_app",
    patterns: [/\bdeploy\s+(this\s+)?(app|site|project)\b/i]
  },
  {
    actionType: "bypass_captcha",
    patterns: [/\bbypass\s+captcha\b/i, /\bsolve\s+captcha\s+without\b/i]
  },
  {
    actionType: "interview_impersonation",
    patterns: [/\bpretend\s+to\s+be\s+me\s+in\s+(an?\s+)?interview\b/i]
  },
  {
    actionType: "exfiltrate_secrets",
    patterns: [/\bexfiltrate\s+secrets\b/i, /\bsteal\s+.+\b(api keys?|tokens?|passwords?)\b/i]
  }
];

@Injectable()
export class SafeActionPolicyService {
  requiresApproval(actionType: string) {
    const normalized = this.normalizeActionType(actionType);

    return approvalRequiredActions.has(normalized) || blockedActions.has(normalized);
  }

  classifyRiskLevel(actionType: string): RiskLevel {
    const normalized = this.normalizeActionType(actionType);

    if (blockedActions.has(normalized)) {
      return "blocked";
    }

    if (highRiskActions.has(normalized)) {
      return "high";
    }

    if (mediumRiskActions.has(normalized)) {
      return "medium";
    }

    return "low";
  }

  classifyAction(actionType: string): RiskClassification {
    const normalized = this.normalizeActionType(actionType);
    const riskLevel = this.classifyRiskLevel(normalized);
    const blocked = riskLevel === "blocked";
    const approvalRequired = this.requiresApproval(normalized);

    return {
      actionType: normalized,
      riskLevel,
      approvalRequired,
      blocked,
      reason: blocked
        ? "Action is blocked by Nami safety policy."
        : approvalRequired
          ? "Action requires approval before execution."
          : "Action is allowed without approval."
    };
  }

  detectCommandAction(command: string): CommandActionDetection {
    const match = commandPatterns.find((candidate) =>
      candidate.patterns.some((pattern) => pattern.test(command))
    );

    if (!match) {
      return {
        matched: false,
        ...this.classifyAction("chat.answer")
      };
    }

    return {
      matched: true,
      ...this.classifyAction(match.actionType)
    };
  }

  normalizeActionType(actionType: string) {
    return actionType.trim().toLowerCase().replace(/[\s-]+/g, "_");
  }
}
