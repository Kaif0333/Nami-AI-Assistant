import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  researchModes,
  researchSourceTypes,
  researchStatuses
} from "./research.types";

describe("research contracts", () => {
  it("keeps supported modes and statuses stable", () => {
    assert.deepEqual(researchModes, ["fast", "deep"]);
    assert.deepEqual(researchStatuses, [
      "pending",
      "running",
      "completed",
      "partial",
      "failed"
    ]);
  });

  it("keeps supported source types stable", () => {
    assert.deepEqual(researchSourceTypes, ["web", "url_context"]);
  });
});
