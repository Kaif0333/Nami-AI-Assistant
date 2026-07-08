import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { classifyAiTaskProfile } from "./model-router";

describe("classifyAiTaskProfile", () => {
  it("routes programming requests to coding", () => {
    assert.equal(
      classifyAiTaskProfile("Fix this TypeScript build error in the repo."),
      "coding"
    );
  });

  it("routes heavy planning requests to reasoning", () => {
    assert.equal(
      classifyAiTaskProfile("Think deeply and compare the architecture tradeoffs."),
      "reasoning"
    );
  });

  it("routes current-source requests to research", () => {
    assert.equal(
      classifyAiTaskProfile("Research the latest model pricing with sources."),
      "research"
    );
  });

  it("routes private local requests to local", () => {
    assert.equal(
      classifyAiTaskProfile("Keep this local only and do not send it anywhere."),
      "local"
    );
  });

  it("routes ordinary chat to fast", () => {
    assert.equal(classifyAiTaskProfile("Good morning Nami."), "fast");
  });
});
