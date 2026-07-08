import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { BadRequestException, NotFoundException } from "@nestjs/common";

import { MemoriesService } from "./memories.service";

describe("MemoriesService", () => {
  it("creates and searches memories with normalized tags", async () => {
    const service = new MemoriesService();

    const memory = await service.createMemory({
      type: "project",
      title: "Nami memory center",
      content: "Build a searchable memory center.",
      tags: ["Nami", "Memory Center", "nami"],
      sensitivity: "personal",
      metadata: { source: "unit-test" }
    });

    assert.equal(memory.status, "active");
    assert.deepEqual(memory.tags, ["nami", "memory-center"]);
    assert.equal(memory.metadata.source, "unit-test");

    const results = await service.listMemories({ query: "searchable" });
    assert.equal(results.length, 1);
    assert.equal(results[0]?.id, memory.id);
  });

  it("rejects secret-like memory content", async () => {
    const service = new MemoriesService();

    await assert.rejects(
      async () =>
        service.createMemory({
          type: "general",
          title: "Secret",
          content: "api key: local-test-value"
        }),
      BadRequestException
    );
  });

  it("updates, disables, and deletes memory records", async () => {
    const service = new MemoriesService();
    const memory = await service.createMemory({
      type: "preference",
      title: "Tone",
      content: "Keep answers concise."
    });

    const updated = await service.updateMemory(memory.id, {
      content: "Keep answers concise and direct.",
      tags: ["style"]
    });
    assert.equal(updated.content, "Keep answers concise and direct.");
    assert.deepEqual(updated.tags, ["style"]);

    const disabled = await service.disableMemory(memory.id);
    assert.equal(disabled.status, "disabled");

    const deleted = await service.deleteMemory(memory.id);
    assert.equal(deleted.id, memory.id);

    await assert.rejects(
      async () => service.getMemory(memory.id),
      NotFoundException
    );
  });
});
