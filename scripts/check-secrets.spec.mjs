import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { scanContentForSecrets } from "./check-secrets.mjs";

const historicalPath = "services/api/src/chat/chat.service.spec.ts";
const sentinelPrefix = "sk" + "-encoded-";
const titleSentinel = `${sentinelPrefix}title-secret-123456`;
const realSecret = "sk" + "-live-secret-not-allowed-123456";

describe("check-secrets historical sentinel handling", () => {
  it("allows exact historical redaction sentinels only in the original history path", () => {
    assert.deepEqual(
      scanContentForSecrets(`const value = "${titleSentinel}";`, `261ae3b:${historicalPath}`),
      []
    );
  });

  it("does not allow the sentinel in tracked HEAD files", () => {
    const findings = scanContentForSecrets(
      `const value = "${titleSentinel}";`,
      `HEAD:${historicalPath}`
    );

    assert.equal(findings.length, 1);
    assert.equal(findings[0]?.kind, "openai-like");
  });

  it("does not allow the sentinel in similarly suffixed paths", () => {
    const findings = scanContentForSecrets(
      `const value = "${titleSentinel}";`,
      `261ae3b:other/${historicalPath}`
    );

    assert.equal(findings.length, 1);
    assert.equal(findings[0]?.kind, "openai-like");
  });

  it("continues scanning the rest of a historical sentinel line", () => {
    const findings = scanContentForSecrets(
      `const values = "${titleSentinel}", "${realSecret}";`,
      `261ae3b:${historicalPath}`
    );

    assert.equal(findings.length, 1);
    assert.equal(findings[0]?.kind, "openai-like");
  });

  it("does not remove a legacy sentinel when it is embedded inside a longer token", () => {
    const findings = scanContentForSecrets(
      `const value = "${titleSentinel}extra";`,
      `261ae3b:${historicalPath}`
    );

    assert.equal(findings.length, 1);
    assert.equal(findings[0]?.kind, "openai-like");
  });
});
