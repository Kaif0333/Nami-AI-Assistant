# Phase 6 Research Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a real, source-backed Phase 6 research system with fast/deep modes, persisted sources, automatic chat routing, a dedicated dashboard, and live Gemini verification.

**Architecture:** A NestJS `ResearchModule` owns research orchestration and persistence behind a provider-neutral interface. A real Gemini adapter uses Google Search grounding with `gemini-2.5-flash-lite`, while the existing research model route synthesizes deep reports. Prisma stores runs and sources, and both the Research page and Chat consume one typed result contract.

**Tech Stack:** pnpm workspaces, NestJS 11, TypeScript 5.9, Prisma 7, PostgreSQL/Supabase, Next.js 16, React 19, Tailwind CSS 4, Node test runner, Playwright.

## Global Constraints

- Use real research and AI providers only; no runtime mock, fake, dummy, or fabricated response provider.
- Default grounded search model is `gemini-2.5-flash-lite`; synthesis uses `AI_RESEARCH_PROVIDER` and `AI_RESEARCH_MODEL`.
- Keep arbitrary local files, Playwright navigation, form submission, and document generation outside Phase 6.
- Reject non-public URLs and treat all external content as untrusted data.
- Never persist full copied webpages or expose secrets in logs, APIs, tests, or Git.
- A research success must include at least one valid source.
- Deep mode defaults to at most four grounded search calls and five explicit URLs.
- Provider call budgets do not impose an artificial answer-length cutoff.
- Preserve the existing API success/error envelopes and citrus command-center UI.
- Update documentation and stop before Phase 7.

---

### Task 1: Persist Research Runs and Sources

**Files:**
- Modify: `services/api/prisma/schema.prisma`
- Create: `services/api/prisma/migrations/20260710190000_phase6_research/migration.sql`
- Create: `services/api/src/research/research.types.ts`
- Test: `services/api/src/research/research.types.spec.ts`

**Interfaces:**
- Produces: `ResearchMode`, `ResearchStatus`, `ResearchReport`, `ResearchSource`, `ResearchRun`, `ResearchRequestInput`, and Prisma `ResearchRun`/`ResearchSource` models.
- Consumes: existing Prisma JSON and timestamp conventions.

- [ ] **Step 1: Write the failing type contract test**

```ts
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
```

- [ ] **Step 2: Run the focused test and confirm it fails**

Run: `corepack pnpm --filter @nami/api exec tsx --test src/research/research.types.spec.ts`

Expected: FAIL because `research.types.ts` does not exist.

- [ ] **Step 3: Add the Nami-owned research types**

```ts
export const researchModes = ["fast", "deep"] as const;
export type ResearchMode = (typeof researchModes)[number];

export const researchStatuses = [
  "pending",
  "running",
  "completed",
  "partial",
  "failed"
] as const;
export type ResearchStatus = (typeof researchStatuses)[number];

export type ResearchReport = {
  summary: string;
  keyFindings: string[];
  recommendations: string[];
  risks: string[];
  actionPlan: string[];
};

export type ResearchSource = {
  id: string;
  researchRunId: string;
  url: string;
  normalizedUrl: string;
  title: string;
  domain: string;
  snippet: string;
  publishedAt: string | null;
  retrievedAt: string;
  sourceType: "web" | "url_context";
  citationMetadata: Record<string, unknown>;
  trusted: false;
  metadata: Record<string, unknown>;
};

export type ResearchRun = ResearchReport & {
  id: string;
  query: string;
  mode: ResearchMode;
  status: ResearchStatus;
  provider: string;
  model: string;
  searchQueries: string[];
  warnings: string[];
  errorMessage: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  metadata: Record<string, unknown>;
  sources: ResearchSource[];
};

export type ResearchRequestInput = {
  query: string;
  mode: ResearchMode;
  urls?: string[];
};
```

- [ ] **Step 4: Add Prisma enums, models, indexes, foreign keys, RLS, and revokes**

Add `ResearchMode`, `ResearchStatus`, `ResearchRun`, and `ResearchSource` to
`schema.prisma`. The SQL migration must create matching PostgreSQL enums and
tables, index `status/created_at`, `mode/created_at`, `research_run_id`, and
`normalized_url`, enable RLS, and revoke `anon`/`authenticated` access when
those roles exist.

- [ ] **Step 5: Validate generated database contracts**

Run: `corepack pnpm db:validate`

Expected: Prisma schema validation succeeds.

Run: `corepack pnpm db:generate`

Expected: Prisma Client generation succeeds with the research models.

Run: `corepack pnpm --filter @nami/api exec tsx --test src/research/research.types.spec.ts`

Expected: PASS.

- [ ] **Step 6: Commit the persistence slice**

```bash
git add services/api/prisma services/api/src/research/research.types.ts services/api/src/research/research.types.spec.ts
git commit -m "feat: add phase 6 research persistence"
```

---

### Task 2: Build Safe Research Primitives and the Real Gemini Adapter

**Files:**
- Create: `services/api/src/research/research-provider.types.ts`
- Create: `services/api/src/research/research-url-policy.ts`
- Create: `services/api/src/research/research-source-normalizer.ts`
- Create: `services/api/src/research/research-report-parser.ts`
- Create: `services/api/src/research/research-intent-classifier.ts`
- Create: `services/api/src/research/gemini-grounded-research.provider.ts`
- Test: `services/api/src/research/research-primitives.spec.ts`
- Test: `services/api/src/research/gemini-grounded-research.provider.spec.ts`

**Interfaces:**
- Produces: `ResearchProvider`, `ResearchEvidence`, `validateResearchUrls()`, `normalizeGroundingSources()`, `parseResearchReport()`, and `classifyResearchIntent()`.
- Consumes: `ConfigService`, `ResearchMode`, and native `fetch`.

- [ ] **Step 1: Write failing tests for URL policy, intent, sources, and report parsing**

Test these exact behaviors:

```ts
assert.deepEqual(validateResearchUrls(["https://example.com/docs"]), [
  "https://example.com/docs"
]);
assert.throws(() => validateResearchUrls(["http://127.0.0.1/admin"]));
assert.throws(() => validateResearchUrls(["file:///C:/secret.txt"]));
assert.equal(classifyResearchIntent("What is the latest Next.js version?").matched, true);
assert.equal(classifyResearchIntent("Help me write a stable sorting function").matched, false);
assert.equal(normalizeGroundingSources(response, runId).length, 1);
assert.equal(parseResearchReport(markdown).summary, "Current result.");
```

- [ ] **Step 2: Run the primitive test and confirm it fails**

Run: `corepack pnpm --filter @nami/api exec tsx --test src/research/research-primitives.spec.ts`

Expected: FAIL because the primitive modules do not exist.

- [ ] **Step 3: Implement bounded public URL validation**

`validateResearchUrls(urls)` must return at most five normalized HTTP(S) URLs
and throw `BadRequestException` with code `RESEARCH_URL_NOT_ALLOWED` for:

```text
localhost
*.localhost
0.0.0.0/8
10.0.0.0/8
100.64.0.0/10
127.0.0.0/8
169.254.0.0/16
172.16.0.0/12
192.168.0.0/16
224.0.0.0/4
::1
fc00::/7
fe80::/10
URLs with credentials
non-HTTP(S) schemes
ports other than 80 or 443
```

- [ ] **Step 4: Implement deterministic intent and report contracts**

`classifyResearchIntent(message)` returns:

```ts
type ResearchIntent = {
  matched: boolean;
  mode: "fast" | "deep";
  urls: string[];
  reason: "explicit" | "current" | "url" | "none";
};
```

Only explicit search/research verbs, public URLs, or current-information terms
trigger research. Deep terms include `deep research`, `comprehensive`,
`competitor comparison`, `feasibility`, and `compare thoroughly`.

`parseResearchReport()` requires these exact headings and throws
`RESEARCH_INVALID_REPORT` when required sections are absent:

```text
## Summary
## Key Findings
## Recommendations
## Risks
## Action Plan
```

- [ ] **Step 5: Write a failing Gemini adapter test with an injected fetch function**

The test must assert the outgoing request uses:

```ts
headers: {
  "Content-Type": "application/json",
  "x-goog-api-key": "configured-test-key"
}
```

and contains:

```json
{
  "tools": [{ "google_search": {} }]
}
```

It must assert that the returned evidence includes provider `gemini`, the
configured search model, grounded text, queries, and normalized sources.

- [ ] **Step 6: Implement the real Gemini adapter**

Define:

```ts
export interface ResearchProvider {
  getStatus(): ResearchProviderStatus;
  search(input: GroundedSearchInput): Promise<ResearchEvidence>;
}
```

`GeminiGroundedResearchProvider` calls:

```text
POST https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent
```

with `x-goog-api-key`, `google_search`, optional `url_context`, an abort
timeout, and trusted instructions stating that source content is data rather
than instructions. It maps missing keys, 429 responses, unavailable responses,
unsafe URLs, empty candidates, and no-source responses to stable research
errors. It never logs request headers or response bodies.

- [ ] **Step 7: Run focused tests**

Run: `corepack pnpm --filter @nami/api exec tsx --test "src/research/research-primitives.spec.ts" "src/research/gemini-grounded-research.provider.spec.ts"`

Expected: PASS with no network call.

- [ ] **Step 8: Commit the provider slice**

```bash
git add services/api/src/research
git commit -m "feat: add grounded Gemini research provider"
```

---

### Task 3: Orchestrate, Persist, and Audit Research

**Files:**
- Create: `services/api/src/research/research.service.ts`
- Test: `services/api/src/research/research.service.spec.ts`

**Interfaces:**
- Consumes: `ResearchProvider`, `AiProviderService.generateText()`, `DatabaseService`, and `ActionLogsService`.
- Produces: `getStatus()`, `runResearch()`, `listResearchRuns()`, and `getResearchRun()`.

- [ ] **Step 1: Write failing service tests**

Cover:

```ts
await service.runResearch({ query: "current Node release", mode: "fast" });
await service.runResearch({ query: "compare runtimes", mode: "deep" });
await service.listResearchRuns({ mode: "deep", status: "completed" });
await service.getResearchRun(run.id);
```

Assert fast mode makes one grounded call, deep mode makes no more than four,
sources are de-duplicated, successful runs contain sources, partial runs retain
warnings, failed runs store an error, and action logs contain no secret-like
content.

- [ ] **Step 2: Run the service tests and confirm they fail**

Run: `corepack pnpm --filter @nami/api exec tsx --test src/research/research.service.spec.ts`

Expected: FAIL because `ResearchService` does not exist.

- [ ] **Step 3: Implement fast orchestration**

`runFastResearch()` validates input, creates a running record, performs one
grounded call, parses the structured report, persists normalized sources, marks
the run completed, and completes the action log.

- [ ] **Step 4: Implement bounded deep orchestration**

Use the existing AI research route to generate two to four newline-delimited
subqueries. Normalize and de-duplicate them, run each through the grounded
provider, then synthesize the combined evidence with the existing
`AiProviderService` and parse the required report headings. Mark the result
`partial` only when at least one source-backed branch succeeded and a complete
report can still be produced.

- [ ] **Step 5: Add database and in-memory persistence**

When `database.client` exists, use Prisma transactions to write the run and its
sources. Otherwise use a private `Map<string, ResearchRun>` and mark metadata as
`in_memory_fallback_no_database_url`, matching existing Phase 4 service
behavior. List at most 50 runs ordered newest first.

- [ ] **Step 6: Add audit transitions**

Create one `research_web` action log in `running` state, then update it to
`completed` or `failed`. Metadata may contain run ID, mode, provider, model,
duration, source count, and warning count. Input preview contains only the
sanitized query length, URL domains, and mode.

- [ ] **Step 7: Run service and existing API tests**

Run: `corepack pnpm --filter @nami/api test`

Expected: all existing suites and research service tests pass.

- [ ] **Step 8: Commit orchestration**

```bash
git add services/api/src/research/research.service.ts services/api/src/research/research.service.spec.ts
git commit -m "feat: orchestrate persisted web research"
```

---

### Task 4: Expose the Research API

**Files:**
- Create: `services/api/src/research/dto/create-research.dto.ts`
- Create: `services/api/src/research/research.controller.ts`
- Create: `services/api/src/research/research.module.ts`
- Modify: `services/api/src/app.module.ts`
- Test: `services/api/src/research/research.controller.spec.ts`

**Interfaces:**
- Consumes: `ResearchService`.
- Produces: `GET /api/research/status`, `POST /api/research`, `GET /api/research`, and `GET /api/research/:id`.

- [ ] **Step 1: Write failing DTO and controller tests**

Assert DTO validation rejects blank queries, unknown modes, more than five
URLs, and unknown properties. Assert each controller method uses the existing
`{ success: true, data }` envelope.

- [ ] **Step 2: Run the controller tests and confirm they fail**

Run: `corepack pnpm --filter @nami/api exec tsx --test src/research/research.controller.spec.ts`

Expected: FAIL because the DTO/controller/module do not exist.

- [ ] **Step 3: Implement validated DTO and endpoints**

Use `class-validator` decorators:

```ts
@IsString()
@MinLength(2)
@MaxLength(4000)
query!: string;

@IsIn(researchModes)
mode!: ResearchMode;

@IsOptional()
@IsArray()
@ArrayMaxSize(5)
@IsUrl({ require_protocol: true }, { each: true })
urls?: string[];
```

List filters accept only known modes/statuses and a bounded query string.

- [ ] **Step 4: Register and verify the module**

Import `ResearchModule` after `MemoriesModule` in `AppModule`. Run:

`corepack pnpm typecheck:api`

Expected: PASS.

- [ ] **Step 5: Commit the API slice**

```bash
git add services/api/src/app.module.ts services/api/src/research
git commit -m "feat: expose phase 6 research API"
```

---

### Task 5: Route Current Chat Queries Through Research

**Files:**
- Modify: `services/api/src/chat/chat.module.ts`
- Modify: `services/api/src/chat/chat.service.ts`
- Modify: `services/api/src/chat/chat.types.ts`
- Modify: `services/api/src/chat/chat.service.spec.ts`
- Modify: `apps/web-dashboard/src/lib/nami-api.ts`

**Interfaces:**
- Consumes: `ResearchService.runResearch()` and `classifyResearchIntent()`.
- Produces: optional `research` metadata on chat responses and stored assistant messages.

- [ ] **Step 1: Add failing chat research tests**

Test that:

```ts
const response = await service.sendMessage({
  message: "What is the latest stable Node.js version?",
  mode: "chat"
});
assert.equal(response.research?.mode, "fast");
assert.equal(response.research?.sources.length, 1);
```

Also assert stable chat does not call research, `deep research` chooses deep
mode, safety actions still run before research, and assistant message metadata
contains the run ID and source summaries.

- [ ] **Step 2: Run the chat tests and confirm the new cases fail**

Run: `corepack pnpm --filter @nami/api exec tsx --test src/chat/chat.service.spec.ts`

Expected: existing tests pass and new research cases fail.

- [ ] **Step 3: Integrate research after safety/memory routing and before normal AI**

Add optional `ResearchService` injection. For a matched intent, call
`runResearch`, record the report text as the assistant reply, attach:

```ts
research: {
  runId: run.id,
  mode: run.mode,
  status: run.status,
  sources: run.sources.map(({ title, url, domain }) => ({ title, url, domain })),
  warnings: run.warnings
}
```

No research query may bypass blocked-action or approval detection.

- [ ] **Step 4: Extend frontend chat contracts**

Add the same optional research metadata to `ChatResponseData` and parse stored
message metadata when conversations are reopened.

- [ ] **Step 5: Run chat and type checks**

Run: `corepack pnpm --filter @nami/api exec tsx --test src/chat/chat.service.spec.ts`

Expected: PASS.

Run: `corepack pnpm typecheck`

Expected: PASS.

- [ ] **Step 6: Commit chat routing**

```bash
git add services/api/src/chat apps/web-dashboard/src/lib/nami-api.ts
git commit -m "feat: route current chat queries through research"
```

---

### Task 6: Build the Research Dashboard and Chat Citations

**Files:**
- Create: `apps/web-dashboard/src/app/research/page.tsx`
- Modify: `apps/web-dashboard/src/lib/nami-api.ts`
- Modify: `apps/web-dashboard/src/data/dashboard.ts`
- Modify: `apps/web-dashboard/src/components/layout/app-shell.tsx`
- Modify: `apps/web-dashboard/src/app/chat/page.tsx`

**Interfaces:**
- Consumes: research API contracts and chat research metadata.
- Produces: `/research` workflow, history/detail rendering, and cited chat messages.

- [ ] **Step 1: Add typed research API functions**

Define `ResearchRun`, `ResearchSource`, `ResearchStatusData`, then add:

```ts
getResearchStatus()
runResearch(input)
listResearchRuns(filters)
getResearchRun(id)
```

- [ ] **Step 2: Build the operational Research page**

Create a client page with:

- A stable fast/deep segmented control.
- Query textarea and up to five removable URL inputs.
- Disabled submit state for blank/running requests.
- Search, synthesis, partial, error, and empty states.
- Report sections rendered as text/lists.
- Safe source links using `target="_blank"` and `rel="noreferrer noopener"`.
- A recent-history list that reloads full run details on selection.
- No nested cards, marketing hero, decorative gradient, or unsupported controls.

- [ ] **Step 3: Add navigation and Phase 6 status**

Add a `Search`/`BookOpenCheck` Lucide icon for `/research`, set system stats to
Phase 6 and `Source-backed research`, and update the safe-build sidebar copy.

- [ ] **Step 4: Render chat citations**

For each assistant message with research metadata, render a compact source list
under the answer. Show the run mode/status and warnings without exposing raw
metadata. Preserve sources after reopening a conversation.

- [ ] **Step 5: Run frontend checks**

Run: `corepack pnpm typecheck:web`

Expected: PASS.

Run: `corepack pnpm lint:web`

Expected: PASS.

Run: `corepack pnpm build:web`

Expected: static export succeeds and includes `/research`.

- [ ] **Step 6: Commit the dashboard slice**

```bash
git add apps/web-dashboard
git commit -m "feat: add source-backed research dashboard"
```

---

### Task 7: Add Deterministic E2E and Real-Provider Smoke Coverage

**Files:**
- Create: `tests/e2e/research.spec.ts`
- Create: `scripts/smoke-research.mjs`
- Modify: `package.json`
- Modify: `tests/e2e/README.md`

**Interfaces:**
- Consumes: built API/dashboard and configured running local API.
- Produces: deterministic browser coverage plus `pnpm smoke:research` for a real Gemini call.

- [ ] **Step 1: Write the deterministic Playwright research test**

Intercept only research API requests in Playwright test scope with a fixed
source-backed fixture. Verify page mode selection, query submission, report
sections, source link, status, and history selection. This test fixture is not
a runtime provider and is never compiled into application code.

- [ ] **Step 2: Add a live smoke command**

`scripts/smoke-research.mjs` sends one fast current-information request to
`http://localhost:4000/api/research`, verifies `success`, at least one source,
and a completed/partial status, then prints only provider/model/source-count
metadata. It never reads or prints `.env.local`.

Add:

```json
"smoke:research": "node scripts/smoke-research.mjs"
```

- [ ] **Step 3: Run deterministic acceptance**

Run: `corepack pnpm test:e2e`

Expected: all Playwright tests pass.

- [ ] **Step 4: Start the built API and run the real smoke**

Start `node services/api/dist/main.js` with the repository root as working
directory, wait for `/api/health`, then run:

`corepack pnpm smoke:research`

Expected: PASS with real Gemini provider/model and one or more sources. Stop
the temporary API process after the smoke.

- [ ] **Step 5: Commit acceptance coverage**

```bash
git add tests/e2e/research.spec.ts tests/e2e/README.md scripts/smoke-research.mjs package.json
git commit -m "test: add phase 6 research acceptance coverage"
```

---

### Task 8: Align Documentation and Run the Full Quality Gate

**Files:**
- Modify: `.env.example`
- Modify: `README.md`
- Modify: `services/research-service/README.md`
- Modify: `docs/15_API_CONTRACTS.md`
- Modify: `docs/16_DATABASE_SCHEMA.md`
- Modify: `docs/24_MODEL_ROUTING_PLAN.md`
- Modify: `docs/32_RESEARCH_AGENT.md`
- Modify: `docs/65_AUDIT_LOGGING.md`
- Modify: `docs/70_TEST_PLAN.md`
- Modify: `docs/72_ACCEPTANCE_CRITERIA.md`
- Modify: `docs/74_MANUAL_TEST_CHECKLIST.md`
- Modify: `docs/80_ROADMAP.md`
- Modify: `docs/83_PHASE_PROMPTS.md`
- Modify: `docs/99_CHANGELOG.md`
- Modify: `docs/104_PROMPT_INJECTION_DEFENSE.md`

**Interfaces:**
- Consumes: verified implementation behavior.
- Produces: reproducible setup, Phase 6 acceptance record, and exact Phase 7 boundary.

- [ ] **Step 1: Document environment variables**

Add empty/example-only values:

```dotenv
RESEARCH_SEARCH_PROVIDER=gemini
RESEARCH_SEARCH_MODEL=gemini-2.5-flash-lite
RESEARCH_DEEP_MAX_SEARCHES=4
RESEARCH_MAX_URLS=5
RESEARCH_REQUEST_TIMEOUT_MS=90000
```

Document current free-tier assumptions as dated guidance, not a guarantee.

- [ ] **Step 2: Update canonical contracts and phase status**

Document implemented APIs, models, source rules, prompt-injection defenses,
manual checks, and Phase 6 acceptance. Mark Phase 6 complete only after the
real smoke and full quality gate pass.

- [ ] **Step 3: Run the full repository gate**

Run sequentially:

```text
corepack pnpm install --frozen-lockfile
corepack pnpm db:validate
corepack pnpm typecheck
corepack pnpm lint
corepack pnpm test
corepack pnpm build:api
corepack pnpm build:web
corepack pnpm build:desktop
corepack pnpm test:e2e
corepack pnpm audit --prod
corepack pnpm check:secrets
corepack pnpm check:secrets:history
git diff --check
```

Expected: every command succeeds. Investigate and fix every failure before
completion.

- [ ] **Step 4: Run final forbidden-content checks**

Run `rg` across runtime source for fake provider classes, fabricated assistant
responses, committed secrets, Phase 7 n8n implementation, and unsafe URL
bypass behavior. Expected: no prohibited implementation.

- [ ] **Step 5: Commit Phase 6 documentation and completion state**

```bash
git add .env.example README.md services/research-service/README.md docs
git commit -m "docs: complete phase 6 research"
```

- [ ] **Step 6: Report and stop**

Report commits, files, migration status, live provider result, all checks,
assumptions, known risks, and the exact next recommendation. Do not push without
explicit approval and do not start Phase 7.
