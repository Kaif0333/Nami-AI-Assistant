import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { isAllowedCorsOrigin, resolveWebOrigins } from "./cors";

describe("resolveWebOrigins", () => {
  it("keeps configured origins", () => {
    const origins = resolveWebOrigins("https://nami.example.com", "production");

    assert.deepEqual(origins, ["https://nami.example.com"]);
  });

  it("adds localhost and desktop webview origins in development", () => {
    const origins = resolveWebOrigins("http://localhost:3000", "development");

    assert.ok(origins.includes("http://localhost:3000"));
    assert.ok(origins.includes("http://127.0.0.1:3000"));
    assert.ok(origins.includes("http://tauri.localhost"));
    assert.ok(origins.includes("https://tauri.localhost"));
    assert.ok(origins.includes("tauri://localhost"));
    assert.ok(origins.includes("asset://localhost"));
    assert.ok(origins.includes("null"));
  });

  it("does not add desktop webview origins in production", () => {
    const origins = resolveWebOrigins("https://nami.example.com", "production");

    assert.equal(origins.includes("http://tauri.localhost"), false);
    assert.equal(origins.includes("null"), false);
  });
});

describe("isAllowedCorsOrigin", () => {
  it("allows same-origin or non-browser requests without an origin header", () => {
    assert.equal(isAllowedCorsOrigin(undefined, []), true);
  });

  it("allows configured origins", () => {
    assert.equal(
      isAllowedCorsOrigin("http://tauri.localhost", ["http://tauri.localhost"]),
      true
    );
  });

  it("rejects untrusted origins", () => {
    assert.equal(
      isAllowedCorsOrigin("https://evil.example", ["http://localhost:3000"]),
      false
    );
  });
});
