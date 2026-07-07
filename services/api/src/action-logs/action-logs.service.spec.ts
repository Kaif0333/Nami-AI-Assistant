import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { SafeActionPolicyService } from "../safety/safe-action-policy.service";
import { ActionLogsService } from "./action-logs.service";

function createService() {
  return new ActionLogsService(new SafeActionPolicyService());
}

describe("ActionLogsService", () => {
  it("creates an action log with sanitized input", () => {
    const service = createService();
    const log = service.createActionLog({
      actionType: "send_email",
      summary: "Send email",
      status: "approval_required",
      inputPreview: {
        to: "kaif@example.com",
        token: "local-test-value"
      }
    });

    assert.equal(log.status, "approval_required");
    assert.equal(log.riskLevel, "high");
    assert.equal(log.inputPreview.token, "[redacted]");
  });

  it("updates logs linked to an approval", () => {
    const service = createService();
    const log = service.createActionLog({
      approvalId: "approval-1",
      actionType: "send_message",
      summary: "Send message",
      status: "approval_required"
    });

    const updated = service.markApprovalLogs("approval-1", "approved");

    assert.equal(updated.length, 1);
    assert.equal(service.getActionLog(log.id).status, "approved");
  });
});
