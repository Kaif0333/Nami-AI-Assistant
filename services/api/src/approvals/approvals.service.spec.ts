import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { BadRequestException } from "@nestjs/common";

import { SafeActionPolicyService } from "../safety/safe-action-policy.service";
import { ApprovalsService } from "./approvals.service";

function createService() {
  return new ApprovalsService(new SafeActionPolicyService());
}

describe("ApprovalsService", () => {
  it("creates an approval request with sanitized payload", () => {
    const service = createService();
    const approval = service.createApprovalRequest({
      actionType: "send_email",
      summary: "Send follow-up email",
      payloadPreview: {
        to: "kaif@example.com",
        apiKey: "local-test-value"
      },
      requestedBy: "Kaif"
    });

    assert.equal(approval.status, "pending");
    assert.equal(approval.riskLevel, "high");
    assert.equal(approval.payloadPreview.apiKey, "[redacted]");
    assert.equal(service.getApprovalRequest(approval.id).id, approval.id);
  });

  it("approves and rejects pending requests", () => {
    const approveService = createService();
    const approval = approveService.createApprovalRequest({
      actionType: "send_message",
      summary: "Send message"
    });

    assert.equal(approveService.approveRequest(approval.id).status, "approved");

    const rejectService = createService();
    const rejection = rejectService.createApprovalRequest({
      actionType: "submit_form",
      summary: "Submit form"
    });

    const rejected = rejectService.rejectRequest(rejection.id, "Not needed");
    assert.equal(rejected.status, "rejected");
    assert.equal(rejected.errorMessage, "Not needed");
  });

  it("blocks blocked action approval creation", () => {
    const service = createService();

    assert.throws(
      () =>
        service.createApprovalRequest({
          actionType: "bypass_captcha",
          summary: "Bypass CAPTCHA"
        }),
      BadRequestException
    );
  });
});
