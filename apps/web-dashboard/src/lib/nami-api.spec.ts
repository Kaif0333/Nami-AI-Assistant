import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { sanitizePublicResearchUrl } from "./nami-api";

describe("sanitizePublicResearchUrl", () => {
  it("strips non-secret query and fragment values from rendered links", () => {
    assert.equal(
      sanitizePublicResearchUrl(
        "https://example.com/docs?topic=research#overview"
      ),
      "https://example.com/docs"
    );
  });

  it("rejects wildcard and local DNS hostnames", () => {
    for (const url of [
      "http://127.0.0.1.nip.io/admin",
      "http://169.254.169.254.sslip.io/latest",
      "http://api.localtest.me/admin",
      "http://api.lvh.me/admin",
      "http://api.vcap.me/admin",
      "http://api.localhost.direct/admin",
      "http://api.local.gd/admin",
      "http://api.traefik.me/admin"
    ]) {
      assert.equal(sanitizePublicResearchUrl(url), undefined, url);
    }
  });

  it("rejects unsafe ports and secret-bearing query or fragment values", () => {
    for (const url of [
      "https://example.com:8443/docs",
      "https://example.com/docs?api_key=secret-value",
      "https://example.com/docs#access_token=secret-value"
    ]) {
      assert.equal(sanitizePublicResearchUrl(url), undefined, url);
    }
  });
});
