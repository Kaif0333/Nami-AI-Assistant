import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { SafeActionPolicyService } from "./safe-action-policy.service";

describe("SafeActionPolicyService", () => {
  const policy = new SafeActionPolicyService();

  it("requires approval for high-risk actions", () => {
    assert.equal(policy.requiresApproval("send_email"), true);
    assert.equal(policy.requiresApproval("push-to-github"), true);
    assert.equal(policy.requiresApproval("deploy app"), true);
  });

  it("classifies blocked actions", () => {
    assert.equal(policy.classifyRiskLevel("bypass_captcha"), "blocked");
    assert.equal(policy.classifyRiskLevel("secretly_record"), "blocked");
    assert.equal(policy.classifyAction("exfiltrate_secrets").blocked, true);
  });

  it("classifies unknown actions as low risk", () => {
    assert.equal(policy.requiresApproval("chat.answer"), false);
    assert.equal(policy.classifyRiskLevel("chat.answer"), "low");
  });

  it("detects risky commands from chat text", () => {
    const detection = policy.detectCommandAction("Please send an email to Kaif.");

    assert.equal(detection.matched, true);
    assert.equal(detection.actionType, "send_email");
    assert.equal(detection.approvalRequired, true);
  });
});
