import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { researchModes, researchStatuses } from "./research.types";

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
});
