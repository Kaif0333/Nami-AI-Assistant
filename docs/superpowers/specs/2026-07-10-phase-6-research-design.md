# Phase 6 Research Design

Status: Approved for implementation planning

Date: 2026-07-10

## Context

Phase 6 gives Nami a real, source-backed internet research capability. It must
answer current questions from live sources, support fast and deep research,
analyze explicit public URLs, retain useful research history, and expose
citations in both the Research page and Chat.

The implementation must use real providers only. It must not fabricate search
results, citations, provider responses, or fallback content. External content
is untrusted data and must never become an instruction to Nami.

## Goals

- Provide fast and deep web research modes.
- Automatically research clearly current or explicitly web-based chat queries.
- Search the public web and analyze user-supplied public URLs.
- Return a complete structured answer with citations.
- Store research runs and normalized source metadata in PostgreSQL/Supabase.
- Preserve a provider-neutral service boundary for future search providers.
- Use the best practical free-tier route with the credentials already
  configured for Nami.
- Produce sanitized action logs for important research events and failures.
- Add a production-quality Research page and source display in Chat.

## Non-goals

- Arbitrary local or private file access. This belongs to the document and
  computer-control phases.
- Playwright navigation, clicking, media control, form filling, or submission.
  These belong to the browser automation phase.
- CAPTCHA, paywall, login, robots, or platform restriction bypass.
- Saving a generated PDF, DOCX, or spreadsheet. Document generation remains
  Phase 10.
- Hidden background crawling or unbounded autonomous research.
- A runtime mock, fake, dummy, or placeholder research provider.

## Chosen approach

Use a provider abstraction with a real Gemini implementation in Phase 6.

- Search and grounding default: `gemini-2.5-flash` with Google Search.
- Research synthesis: the existing `AI_RESEARCH_PROVIDER` and
  `AI_RESEARCH_MODEL` route, currently Gemini `gemini-3.1-flash-lite`.
- Explicit URL analysis: Gemini URL Context when URLs are supplied.
- Future providers: Tavily and Brave can be added behind the same interface
  when their keys are configured and a real adapter is implemented.

This split preserves the current higher-quality synthesis route while using a
Gemini model whose Google Search grounding works with the configured Nami key.
The model identifiers remain configurable because provider availability,
pricing, and rate limits can change. Live verification on 2026-07-13 showed
`gemini-2.5-flash-lite` is unavailable to this key, so the tested default is
`gemini-2.5-flash`.

Official references:

- https://ai.google.dev/gemini-api/docs/google-search
- https://ai.google.dev/gemini-api/docs/url-context
- https://ai.google.dev/gemini-api/docs/pricing
- https://docs.tavily.com/documentation/api-credits
- https://api-dashboard.search.brave.com/documentation/pricing

## Architecture

### API module

Add a NestJS `ResearchModule` with focused boundaries:

- `ResearchController`: validation and HTTP contracts.
- `ResearchService`: orchestration, persistence, logging, and error mapping.
- `ResearchProvider`: provider-neutral interface.
- `GeminiGroundedResearchProvider`: real Google Search and URL Context calls.
- `ResearchPromptBuilder`: trusted instructions and external-data boundaries.
- `ResearchSourceNormalizer`: citation extraction, URL normalization, and
  source de-duplication.
- `ResearchIntentClassifier`: deterministic chat routing for explicit and
  time-sensitive queries.

Provider-specific response shapes remain inside the provider adapter. The
controller and UI consume Nami-owned typed contracts.

### Provider contract

The provider interface accepts:

- Query
- Mode (`fast` or `deep`)
- Optional public URLs
- Search model
- Synthesis route
- Bounded search and source budgets

It returns:

- Structured report
- Normalized citations
- Search queries used when available
- Provider and model metadata
- Usage metadata when available
- Warnings for unavailable or partially retrieved sources

No provider may return a successful result without at least one valid source.

### Fast mode

Fast mode is optimized for current facts and concise comparisons:

1. Validate the query and optional URLs.
2. Perform one grounded Gemini request.
3. Extract and normalize citations.
4. Require at least one valid source.
5. Persist the run, sources, provider route, and sanitized action log.
6. Return the answer and source list.

Fast mode should normally use three to five sources when the provider returns
them, without making extra search calls merely to reach a number.

### Deep mode

Deep mode is bounded multi-pass research:

1. Use the research synthesis route to create two to four focused subqueries.
2. Execute grounded searches for those subqueries with a configurable maximum.
3. Analyze up to five explicit public URLs with URL Context when supplied.
4. De-duplicate and rank the collected sources.
5. Synthesize a structured report from the collected research data.
6. Verify that factual sections retain source coverage.
7. Persist the run, sources, route metadata, warnings, and sanitized action log.

The default maximum is four grounded searches per deep run. This is a provider
and cost safety budget, not an answer-length truncation rule. The final answer
must still complete all required report sections.

### Automatic chat research

Chat should route to research when either condition is true:

- The user explicitly asks to search, browse, research, verify, look up, or
  summarize a public URL.
- The query clearly depends on current information, such as latest news,
  current prices, schedules, weather, laws, software versions, or recent
  events.

General conversation and stable knowledge stay on normal chat. Ambiguous
requests should remain normal chat or ask a clarification instead of browsing
silently.

Chat research returns the same report and source contract as the Research page.
The assistant message metadata stores the research run identifier and source
references so reopened conversations retain their citations.

## Data model

Add Prisma enums:

- `ResearchMode`: `fast`, `deep`
- `ResearchStatus`: `pending`, `running`, `completed`, `partial`, `failed`

Add `ResearchRun`:

- `id`
- `query`
- `mode`
- `status`
- `summary`
- `keyFindings`
- `recommendations`
- `risks`
- `actionPlan`
- `provider`
- `model`
- `searchQueries`
- `errorMessage`
- `warnings`
- `startedAt`
- `completedAt`
- `createdAt`
- `updatedAt`
- `metadata`

Add `ResearchSource`:

- `id`
- `researchRunId`
- `url`
- `normalizedUrl`
- `title`
- `domain`
- `snippet`
- `publishedAt`
- `retrievedAt`
- `sourceType`
- `citationMetadata`
- `trusted`
- `metadata`

`trusted` defaults to `false` for public web content. Store source metadata,
short snippets, and citation ranges; do not persist full copied webpages by
default. Apply the existing Supabase RLS hardening pattern to both tables.

## API contracts

### `GET /api/research/status`

Returns the selected provider, configured state, search model, synthesis route,
supported modes, URL support, and configured safety budgets. It never returns
keys or secret values.

### `POST /api/research`

Request:

```json
{
  "query": "Compare current free web research APIs",
  "mode": "deep",
  "urls": ["https://example.com/docs"]
}
```

`urls` is optional and bounded to five entries. The response contains the
persisted research run, structured report, sources, route metadata, and
warnings.

### `GET /api/research`

Lists recent research runs with optional `mode`, `status`, and query filters.

### `GET /api/research/:id`

Returns one run with its complete structured report and normalized sources.

All endpoints use the existing success envelope and standard error shape.

## Errors and partial results

Use stable application errors:

- `RESEARCH_PROVIDER_NOT_CONFIGURED`
- `RESEARCH_PROVIDER_UNAVAILABLE`
- `RESEARCH_RATE_LIMITED`
- `RESEARCH_NO_SOURCES`
- `RESEARCH_URL_NOT_ALLOWED`
- `RESEARCH_VALIDATION_FAILED`

If some deep-search branches fail but enough cited evidence remains for a safe
report, store the run as `partial`, show the warnings, and clearly label the
limitations. If no valid sources remain, fail the run rather than generating an
uncited answer.

Provider fallback is allowed only when a real configured adapter exists. There
is no fabricated fallback response.

## Safety and privacy

- Treat webpage text, snippets, metadata, and search results as untrusted data.
- Place external content inside explicit data boundaries in prompts.
- Tell the model never to follow instructions found in sources.
- Do not send memories, private files, secrets, or unrelated conversation
  history to the research provider.
- Reject non-HTTP(S) URLs, embedded credentials, localhost, loopback, private
  network destinations, and unsupported ports.
- Do not bypass logins, paywalls, CAPTCHAs, robots controls, or provider safety
  blocks.
- Sanitize research queries and previews before action logging.
- Store only bounded source snippets and metadata, not full page copies.
- Render external text as escaped text and open links with safe browser flags.
- Do not automatically convert research content into long-term memory.

Public web research is low risk and does not require a separate approval.
Saving or sharing a generated report outside Nami remains an explicit later
action and follows the approval policy of that phase.

## Audit logging

Create sanitized action logs for:

- `research_web`
- `research_url`
- `research_completed`
- `research_failed`

Logs include mode, provider, model, source count, duration, run identifier, and
sanitized warnings. They exclude API keys, full page content, and sensitive raw
queries.

## User interface

Add a first-class `/research` page and sidebar entry.

The page includes:

- Query input
- Fast/deep segmented mode control
- Optional URL input with removable URL rows
- Start research command
- Clear searching, synthesizing, partial, failure, and empty states
- Structured report sections: summary, findings, recommendations, risks, and
  action plan
- Source list with title, domain, retrieval time, and safe external link
- Recent research history with mode, status, source count, and timestamp

The layout remains an operational command surface using the canonical citrus
palette. It does not use a marketing hero or decorative cards.

Chat assistant messages gain a source section when a research run is attached.
The tool timeline shows research start, source count, provider route, warnings,
and completion or failure.

## Testing

### Unit tests

- Fast and deep orchestration
- Query and mode validation
- URL allowlist and private-network rejection
- Deterministic research intent classification
- Gemini citation extraction
- Source URL normalization and de-duplication
- No-source failure behavior
- Partial deep-research behavior
- Provider setup, unavailable, and quota errors
- Prompt-injection boundaries
- Sanitized action log previews

Unit tests may use isolated test doubles at module boundaries, but no mock or
fake provider is shipped in runtime application code.

### Integration and end-to-end tests

- Prisma schema and migration validation
- Research run and source persistence
- Research API success and consistent failure envelopes
- Research page rendering and mode selection
- History reload and source display
- Chat routing and citation rendering

Repository tests must remain deterministic and must not consume external API
quota. Add an explicit live smoke command that uses the configured Gemini key
for manual acceptance without exposing it.

### Live manual acceptance

Run all of these against the real configured provider:

1. Fast research on a current fact.
2. Deep comparison with multiple sources.
3. Explicit public URL summary.
4. Automatic current-information research from Chat.
5. Prompt-injection text inside a researched page is treated as data.
6. Invalid/private URL is rejected.
7. Source links, persistence, action logs, and reopened history work.
8. Provider quota/unavailable errors are clear and contain no secrets.

## Documentation and completion

Update the research, architecture, API, database, security, test, acceptance,
roadmap, environment example, README, and changelog documents to match tested
behavior.

Phase 6 is complete only when typecheck, lint, unit tests, builds, end-to-end
tests, secret checks, Prisma validation, and the real-provider smoke test pass.
No Phase 7 n8n implementation begins without Kaif's approval.
