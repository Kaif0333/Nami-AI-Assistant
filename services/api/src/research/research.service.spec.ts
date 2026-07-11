import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { HttpException } from "@nestjs/common";

import type { ActionLog } from "../action-logs/action-log.types";
import { ActionLogsService } from "../action-logs/action-logs.service";
import type { GenerateTextInput, GenerateTextResult } from "../ai/ai-provider.types";
import { AiProviderService } from "../ai/ai-provider.service";
import { DatabaseService } from "../database/database.service";
import type {
  GroundedSearchInput,
  ResearchEvidence,
  ResearchProvider
} from "./research-provider.types";
import { ResearchService } from "./research.service";
import type { ResearchSource } from "./research.types";

const report = [
  "## Summary",
  "A grounded summary.",
  "## Key Findings",
  "- Finding one",
  "## Recommendations",
  "- Recommendation one",
  "## Risks",
  "- Risk one",
  "## Action Plan",
  "- Action one"
].join("\n");

describe("ResearchService", () => {
  it("runs fast research with one grounded call and sanitized auditing", async () => {
    const harness = createHarness({
      evidence: [
        evidence({
          sources: [
            source("https://example.com/current", "source-1"),
            source("https://example.com/current", "source-duplicate")
          ]
        })
      ]
    });
    const sensitiveQuery = "current Node release with confidential context";

    const run = await harness.service.runResearch({
      query: sensitiveQuery,
      mode: "fast",
      urls: ["https://docs.example.com/releases"]
    });

    assert.equal(harness.searchInputs.length, 1);
    assert.equal(run.status, "completed");
    assert.equal(run.sources.length, 1);
    assert.equal(run.metadata.persistence, "in_memory_fallback_no_database_url");
    assert.equal(harness.createdLogs.length, 1);
    assert.equal(harness.createdLogs[0]?.actionType, "research_web");
    assert.equal(harness.createdLogs[0]?.status, "running");
    assert.deepEqual(harness.createdLogs[0]?.inputPreview, {
      queryLength: sensitiveQuery.length,
      urlDomains: ["docs.example.com"],
      mode: "fast"
    });
    assert.equal(harness.updatedLogs.at(-1)?.status, "completed");
    assert.doesNotMatch(
      JSON.stringify([harness.createdLogs, harness.updatedLogs]),
      /confidential context/
    );
  });

  it("bounds deep research, deduplicates evidence, and synthesizes via research AI", async () => {
    const harness = createHarness({
      aiResponses: [
        "runtime performance\nRuntime performance\nruntime security\nruntime ecosystem\nruntime deployment",
        report
      ],
      evidence: [
        evidence({ sources: [source("https://example.com/shared", "one")] }),
        evidence({ sources: [source("https://example.com/security", "two")] }),
        evidence({ sources: [source("https://example.com/shared", "three")] }),
        evidence({ sources: [source("https://example.com/deploy", "four")] })
      ]
    });

    const run = await harness.service.runResearch({
      query: "compare runtimes",
      mode: "deep"
    });

    assert.equal(harness.searchInputs.length, 4);
    assert.equal(run.status, "completed");
    assert.equal(run.sources.length, 3);
    assert.equal(harness.aiInputs.length, 2);
    assert.ok(harness.aiInputs.every((input) => input.taskProfile === "research"));
    assert.equal(harness.aiInputs.some((input) => input.maxOutputTokens !== undefined), false);
    assert.deepEqual(run.searchQueries, [
      "runtime performance",
      "runtime security",
      "runtime ecosystem",
      "runtime deployment"
    ]);
  });

  it("marks deep research partial only when a source-backed branch can be synthesized", async () => {
    const harness = createHarness({
      aiResponses: ["branch one\nbranch two", report],
      evidence: [
        evidence({
          warnings: ["Source date was unavailable."],
          sources: [source("https://example.com/one", "one")]
        }),
        new Error("branch unavailable")
      ]
    });

    const run = await harness.service.runResearch({
      query: "compare partial evidence",
      mode: "deep"
    });

    assert.equal(run.status, "partial");
    assert.equal(run.sources.length, 1);
    assert.ok(run.warnings.includes("Source date was unavailable."));
    assert.ok(run.warnings.includes("Research branch 2 failed."));
    assert.equal(harness.updatedLogs.at(-1)?.status, "completed");
  });

  it("persists a failed run and completes its audit transition as failed", async () => {
    const harness = createHarness({
      evidence: [new Error("provider internal diagnostic detail")]
    });

    await assert.rejects(
      () =>
        harness.service.runResearch({
          query: "current Node release",
          mode: "fast"
        }),
      /Research failed/
    );

    const runs = await harness.service.listResearchRuns({ status: "failed" });
    assert.equal(runs.length, 1);
    assert.equal(runs[0]?.status, "failed");
    assert.equal(runs[0]?.errorMessage, "Research failed.");
    assert.equal(runs[0]?.sources.length, 0);
    assert.equal(harness.updatedLogs.at(-1)?.status, "failed");
    assert.doesNotMatch(JSON.stringify(harness.updatedLogs), /internal diagnostic detail/);
  });

  it("preserves the sanitized research failure when the failed audit update fails", async () => {
    const harness = createHarness({
      evidence: [new Error("provider internal diagnostic detail")],
      updateActionLogError: new Error("audit database password exposed")
    });

    await assert.rejects(
      () =>
        harness.service.runResearch({
          query: "current Node release",
          mode: "fast"
        }),
      (error) => {
        assert.match(String(error), /Research failed/);
        assert.doesNotMatch(String(error), /audit database password exposed/);
        return true;
      }
    );

    const runs = await harness.service.listResearchRuns({ status: "failed" });
    assert.equal(runs.length, 1);
    assert.equal(runs[0]?.status, "failed");
    assert.equal(runs[0]?.errorMessage, "Research failed.");
    assert.equal(harness.updatedLogs.length, 0);
  });

  it("persists a failed run when a grounded report has empty required sections", async () => {
    const harness = createHarness({
      evidence: [
        evidence({
          text: [
            "## Summary",
            "## Key Findings",
            "## Recommendations",
            "## Risks",
            "## Action Plan"
          ].join("\n")
        })
      ]
    });

    await assert.rejects(
      () =>
        harness.service.runResearch({
          query: "current Node release",
          mode: "fast"
        }),
      /Research report is invalid/
    );

    const runs = await harness.service.listResearchRuns({ status: "failed" });
    assert.equal(runs.length, 1);
    assert.equal(runs[0]?.errorMessage, "Research report is invalid.");
  });

  it("sanitizes an HttpException from audit-log creation", async () => {
    const auditSecret = "audit secret token must not be exposed";
    const harness = createHarness({
      actionLogError: new HttpException({ message: auditSecret }, 503)
    });

    await assert.rejects(
      () =>
        harness.service.runResearch({
          query: "current Node release",
          mode: "fast"
        }),
      (error) => {
        assert.match(String(error), /Research failed/);
        assert.doesNotMatch(JSON.stringify(error), /audit secret token/);
        return true;
      }
    );

    const runs = await harness.service.listResearchRuns({ status: "failed" });
    assert.equal(runs.length, 1);
    assert.equal(runs[0]?.status, "failed");
    assert.equal(runs[0]?.errorMessage, "Research failed.");
    assert.equal(harness.searchInputs.length, 0);
    assert.equal(harness.updatedLogs.length, 0);
    assert.doesNotMatch(JSON.stringify(runs), /audit secret token/);
  });

  it("sanitizes an HttpException from the completed audit transition", async () => {
    const auditSecret = "audit secret token must not be exposed";
    const harness = createHarness({
      updateActionLogError: new HttpException({ message: auditSecret }, 503)
    });

    await assert.rejects(
      () =>
        harness.service.runResearch({
          query: "current Node release",
          mode: "fast"
        }),
      (error) => {
        assert.match(String(error), /Research failed/);
        assert.doesNotMatch(JSON.stringify(error), /audit secret token/);
        return true;
      }
    );

    const failedRuns = await harness.service.listResearchRuns({ status: "failed" });
    const completedRuns = await harness.service.listResearchRuns({ status: "completed" });
    assert.equal(failedRuns.length, 1);
    assert.equal(failedRuns[0]?.status, "failed");
    assert.equal(failedRuns[0]?.errorMessage, "Research failed.");
    assert.equal(completedRuns.length, 0);
    assert.equal(harness.updatedLogs.length, 0);
    assert.doesNotMatch(JSON.stringify(failedRuns), /audit secret token/);
  });

  it("lists at most 50 newest matching runs and gets a run by id", async () => {
    const harness = createHarness({ evidence: Array.from({ length: 52 }, () => evidence()) });
    const created = [];

    for (let index = 0; index < 52; index += 1) {
      created.push(
        await harness.service.runResearch({
          query: `deep query ${index}`,
          mode: "fast"
        })
      );
    }

    const runs = await harness.service.listResearchRuns({
      mode: "fast",
      status: "completed"
    });

    assert.equal(runs.length, 50);
    assert.equal(runs[0]?.id, created.at(-1)?.id);
    assert.deepEqual(await harness.service.getResearchRun(created[10]!.id), created[10]);
  });

  it("rejects non-public URLs before provider and audit calls", async () => {
    const harness = createHarness();

    await assert.rejects(
      () =>
        harness.service.runResearch({
          query: "inspect local service",
          mode: "fast",
          urls: ["http://127.0.0.1/admin"]
        }),
      /Research URL is not allowed/
    );

    assert.equal(harness.searchInputs.length, 0);
    assert.equal(harness.createdLogs.length, 0);
  });

  it("reports the grounded provider status", () => {
    const harness = createHarness();

    assert.deepEqual(harness.service.getStatus(), harness.provider.getStatus());
  });
});

function createHarness(options: {
  actionLogError?: Error;
  aiResponses?: string[];
  evidence?: Array<ResearchEvidence | Error>;
  updateActionLogError?: Error;
} = {}) {
  const searchInputs: GroundedSearchInput[] = [];
  const aiInputs: GenerateTextInput[] = [];
  const createdLogs: Array<Record<string, unknown>> = [];
  const updatedLogs: Array<Partial<ActionLog>> = [];
  let evidenceIndex = 0;
  let aiIndex = 0;

  const provider: ResearchProvider = {
    getStatus() {
      return {
        provider: "gemini",
        configured: true,
        model: "gemini-2.5-flash-lite",
        supportedModes: ["fast", "deep"],
        supportsUrlContext: true,
        maxUrls: 5,
        requestTimeoutMs: 90_000
      };
    },
    async search(input) {
      searchInputs.push(input);
      const result = options.evidence?.[evidenceIndex++] ?? evidence();

      if (result instanceof Error) {
        throw result;
      }

      return {
        ...result,
        sources: result.sources.map((item) => ({
          ...item,
          researchRunId: input.researchRunId
        }))
      };
    }
  };
  const aiProvider = {
    async generateText(input: GenerateTextInput): Promise<GenerateTextResult> {
      aiInputs.push(input);
      return {
        text: options.aiResponses?.[aiIndex++] ?? report,
        provider: "gemini",
        model: "gemini-synthesis",
        taskProfile: "research"
      };
    }
  } as AiProviderService;
  const actionLogs = {
    async createActionLog(input: Record<string, unknown>) {
      if (options.actionLogError) {
        throw options.actionLogError;
      }

      createdLogs.push(input);
      return { id: "action-log-id", ...input };
    },
    async updateActionLog(_id: string, updates: Partial<ActionLog>) {
      if (options.updateActionLogError) {
        throw options.updateActionLogError;
      }

      updatedLogs.push(updates);
      return updates;
    }
  } as unknown as ActionLogsService;
  const database = { client: null, enabled: false } as unknown as DatabaseService;

  return {
    service: new ResearchService(provider, aiProvider, actionLogs, database),
    provider,
    searchInputs,
    aiInputs,
    createdLogs,
    updatedLogs
  };
}

function evidence(overrides: Partial<ResearchEvidence> = {}): ResearchEvidence {
  return {
    provider: "gemini",
    model: "gemini-2.5-flash-lite",
    text: report,
    searchQueries: [],
    sources: [source("https://example.com/default", "default")],
    warnings: [],
    usageMetadata: {},
    ...overrides
  };
}

function source(url: string, id: string): ResearchSource {
  const parsed = new URL(url);

  return {
    id,
    researchRunId: "pending",
    url,
    normalizedUrl: parsed.toString(),
    title: parsed.hostname,
    domain: parsed.hostname,
    snippet: "",
    publishedAt: null,
    retrievedAt: new Date().toISOString(),
    sourceType: "web",
    citationMetadata: {},
    trusted: false,
    metadata: { provider: "gemini" }
  };
}
