import { BadRequestException, ValidationPipe } from "@nestjs/common";
import assert from "node:assert/strict";
import test from "node:test";

import {
  CreateResearchDto,
  ListResearchDto
} from "./dto/create-research.dto";
import { ResearchController } from "./research.controller";
import { ResearchService } from "./research.service";

const validationPipe = new ValidationPipe({
  forbidNonWhitelisted: true,
  transform: true,
  whitelist: true
});

test("rejects a blank research query", async () => {
  await assert.rejects(
    validateCreateResearch({ query: "   ", mode: "fast" }),
    BadRequestException
  );
});

test("rejects an unknown research mode", async () => {
  await assert.rejects(
    validateCreateResearch({ query: "Compare AI assistants", mode: "slow" }),
    BadRequestException
  );
});

test("rejects more than five research URLs", async () => {
  await assert.rejects(
    validateCreateResearch({
      query: "Compare AI assistants",
      mode: "fast",
      urls: Array.from({ length: 6 }, (_, index) => `https://example${index}.com`)
    }),
    BadRequestException
  );
});

test("rejects unknown create-research properties", async () => {
  await assert.rejects(
    validateCreateResearch({
      query: "Compare AI assistants",
      mode: "fast",
      unexpected: true
    }),
    BadRequestException
  );
});

test("rejects invalid research list filters", async () => {
  await assert.rejects(
    validateListResearch({ mode: "slow" }),
    BadRequestException
  );
  await assert.rejects(
    validateListResearch({ status: "queued" }),
    BadRequestException
  );
  await assert.rejects(
    validateListResearch({ query: "a".repeat(4001) }),
    BadRequestException
  );
});

test("returns a success envelope for research status", () => {
  const status = { configured: true, provider: "gemini" };
  const controller = createController({ getStatus: () => status });

  assert.deepEqual(controller.getStatus(), { success: true, data: status });
});

test("returns a success envelope for a new research run", async () => {
  const run = { id: "run-1", query: "Compare AI assistants", mode: "fast" };
  const controller = createController({ runResearch: async () => run });

  assert.deepEqual(
    await controller.createResearch({
      query: "Compare AI assistants",
      mode: "fast"
    }),
    { success: true, data: run }
  );
});

test("returns a success envelope for research run lists", async () => {
  const runs = [{ id: "run-1" }];
  const controller = createController({ listResearchRuns: async () => runs });

  assert.deepEqual(
    await controller.listResearchRuns({ mode: "deep", status: "completed" }),
    {
      success: true,
      data: { researchRuns: runs }
    }
  );
});

test("returns a success envelope for a research run", async () => {
  const run = { id: "run-1" };
  const controller = createController({ getResearchRun: async () => run });

  assert.deepEqual(await controller.getResearchRun("run-1"), {
    success: true,
    data: run
  });
});

async function validateCreateResearch(value: Record<string, unknown>) {
  return validationPipe.transform(value, {
    metatype: CreateResearchDto,
    type: "body"
  });
}

async function validateListResearch(value: Record<string, unknown>) {
  return validationPipe.transform(value, {
    metatype: ListResearchDto,
    type: "query"
  });
}

function createController(
  methods: Partial<
    Pick<
      ResearchService,
      "getStatus" | "runResearch" | "listResearchRuns" | "getResearchRun"
    >
  >
) {
  return new ResearchController(methods as ResearchService);
}
