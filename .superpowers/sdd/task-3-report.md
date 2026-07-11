# Phase 6 Task 3 Report

## Status

Implemented and committed the research service orchestration layer for fast and
deep grounded research, Prisma and in-memory persistence, and action-log
lifecycle auditing.

## TDD Evidence

### RED

Command:

```text
corepack pnpm --filter @nami/api exec tsx --test src/research/research.service.spec.ts
```

Result: failed with exit code 1 because `./research.service` did not exist.
Node reported `MODULE_NOT_FOUND`, which was the expected failure before the
service implementation was created.

### GREEN

Focused service command:

```text
corepack pnpm --filter @nami/api exec tsx --test src/research/research.service.spec.ts
```

Result: passed with 7 tests, 1 suite, and 0 failures.

Full API command:

```text
corepack pnpm --filter @nami/api test
```

Result: passed with 77 tests, 17 suites, and 0 failures.

API typecheck command:

```text
corepack pnpm typecheck:api
```

Result: Prisma Client generation and TypeScript `--noEmit` typecheck passed.

Whitespace command:

```text
git diff --check
```

Result: passed with no whitespace errors. `git diff --cached --check` also
passed before commit.

Additional security check:

```text
corepack pnpm check:secrets
```

Result: passed after the new files were staged.

## Coverage

- Fast mode performs one grounded provider call and requires a parsed report
  with at least one normalized source.
- Deep mode creates two to four de-duplicated subqueries, performs no more than
  four grounded calls, and synthesizes through `AiProviderService.generateText`
  with the `research` task profile and no service-imposed output token limit.
- Partial runs require successful source-backed evidence and a complete parsed
  synthesis report; branch failures are retained as sanitized warnings.
- Completed and failed lifecycle states persist through Prisma when configured
  and through a private in-memory map otherwise.
- Lists are filtered, newest first, and limited to 50 records.
- Non-public URLs are rejected before provider or audit calls.
- Action logs transition from `running` to `completed` or `failed` and contain
  only bounded metadata and sanitized input previews.

## Files Changed

- `services/api/src/research/research.service.ts`
- `services/api/src/research/research.service.spec.ts`

No controller, module, UI, or shared type files were changed.

## Commit

`7eac2ccd2a14458173d098a984388e8e9fa45b28` - `feat: orchestrate persisted web research`

## Concerns

- Prisma operations are covered by generated client types and API typechecking,
  but this task did not run a live PostgreSQL integration test because no live
  database test was required or configured.
- The service is intentionally not wired into a Nest module or exposed through
  an API endpoint; those belong to later Phase 6 tasks.

---

## Reviewer Fix - 2026-07-11

### Status

Fixed the three Important reviewer findings: Phase 6 URL inputs now require
domain hostnames and reject internal-use suffixes, parsed reports require
meaningful content in every required section, and audit-log creation failures
transition an already-persisted running record to failed with a sanitized error.

### RED Evidence

Command:

```text
corepack pnpm --filter @nami/api exec tsx --test src/research/research-primitives.spec.ts
```

Result: failed with exit code 1. The URL policy accepted
`http://intranet/admin`, and the parser accepted reports without meaningful
required-section content. Totals: 11 tests, 9 passed, 2 failed.

Command:

```text
corepack pnpm --filter @nami/api exec tsx --test src/research/research.service.spec.ts
```

Result: failed with exit code 1. A heading-only report completed instead of
failing, and audit-log creation exposed its raw error before the running record
could be marked failed. Totals: 9 tests, 7 passed, 2 failed.

### GREEN Evidence

- Research primitives: 11 tests passed, 4 suites, 0 failures.
- Research service: 9 tests passed, 1 suite, 0 failures.
- Full API suite: 80 tests passed, 17 suites, 0 failures.
- API typecheck: Prisma Client generation and TypeScript `--noEmit` passed.
- Secret scan: passed for tracked files.
- `git diff --check`: passed with no whitespace errors.

### Files Changed

- `services/api/src/research/research-url-policy.ts`
- `services/api/src/research/research-report-parser.ts`
- `services/api/src/research/research-primitives.spec.ts`
- `services/api/src/research/research.service.ts`
- `services/api/src/research/research.service.spec.ts`
- `.superpowers/sdd/task-3-report.md`

### Commit

`2308a2845e4818dfc65ca6f80bde67308b3a23aa` -
`fix: harden research orchestration safety`

### Concerns

- No DNS or network resolution was added; hostname checks are intentionally
  deterministic Phase 6 syntax and suffix checks.
- Prisma persistence remains covered by generated client types and API
  typechecking, but not by a behavioral Prisma test double. Reproducing nested
  transaction and relation-return behavior in this focused spec would be
  disproportionate and brittle, so live PostgreSQL persistence smoke remains
  deferred to the Phase 6 final gate.

---

## Reviewer Fix 2 - 2026-07-11

### Status

Fixed the remaining Task 3 re-review findings: empty markdown markers no
longer satisfy a report summary, and a failed audit-log update cannot replace
the original sanitized research failure.

### RED Evidence

```text
corepack pnpm --filter @nami/api exec tsx --test src/research/research-primitives.spec.ts
```

Result: failed with exit code 1. The parser accepted a summary consisting only
of a markdown marker. Totals: 11 tests, 10 passed, 1 failed.

```text
corepack pnpm --filter @nami/api exec tsx --test src/research/research.service.spec.ts
```

Result: failed with exit code 1. A failed action-log update surfaced its raw
error (`audit database password exposed`) instead of `Research failed.`
Totals: 10 tests, 9 passed, 1 failed.

### GREEN Evidence

- Research primitives: 11 tests passed, 4 suites, 0 failures.
- Research service: 10 tests passed, 1 suite, 0 failures.
- Full API suite: 81 tests passed, 17 suites, 0 failures.
- API typecheck: Prisma Client generation and TypeScript `--noEmit` passed.
- Secret scan: passed for tracked files.
- `git diff --check`: passed with no whitespace errors.

### Files Changed

- `services/api/src/research/research-report-parser.ts`
- `services/api/src/research/research-primitives.spec.ts`
- `services/api/src/research/research.service.ts`
- `services/api/src/research/research.service.spec.ts`
- `.superpowers/sdd/task-3-report.md`

### Commit

`d6387dd0487bb16fb50d01d96bf3ad431ad60ef5` -
`fix: guard research failure handling`

### Concerns

None. The failed audit update remains best effort by design, while the research
run is still persisted as failed and the caller receives the original sanitized
research failure.

---

## Reviewer Fix 3 - 2026-07-11

### Status

Fixed the remaining parser validation gap: punctuation-only summary content and
punctuation-only list items no longer satisfy required research report sections.

### TDD Evidence

#### RED

```text
corepack pnpm --filter @nami/api exec tsx --test src/research/research-primitives.spec.ts
```

Result: failed with exit code 1 because the parser accepted a report whose
summary and every required list section contained only punctuation. Totals: 11
tests, 10 passed, 1 failed.

#### GREEN

- Research primitives: 11 tests passed, 4 suites, 0 failures.
- Research service: 10 tests passed, 1 suite, 0 failures.
- Full API suite: 81 tests passed, 17 suites, 0 failures.
- API typecheck: Prisma Client generation and TypeScript `--noEmit` passed.
- Secret scan: passed for tracked files.
- `git diff --check`: passed with no whitespace errors.

### Files Changed

- `services/api/src/research/research-report-parser.ts`
- `services/api/src/research/research-primitives.spec.ts`
- `.superpowers/sdd/task-3-report.md`

### Commit

`31dea6c` - `fix: reject punctuation-only research reports`

### Concerns

The meaningful-content check intentionally uses ASCII alphanumeric characters,
matching the specified alphanumeric requirement. Reports containing only
non-Latin letters are not accepted by this focused validation.

---

## Reviewer Fix 4 - 2026-07-11

### Status

Updated meaningful-content validation to allow Unicode letters and numbers
while continuing to reject punctuation-only and marker-only report content.

### RED Evidence

```text
corepack pnpm --filter @nami/api exec tsx --test src/research/research-primitives.spec.ts
```

Result: failed with exit code 1 because a valid Hindi-only report was rejected.
Totals: 12 tests, 11 passed, 1 failed.

### GREEN Evidence

- Research primitives: 12 tests passed, 4 suites, 0 failures.
- Research service: 10 tests passed, 1 suite, 0 failures.
- Full API suite: 82 tests passed, 17 suites, 0 failures.
- API typecheck: passed.
- Secret scan: passed for tracked files.
- `git diff --check`: passed with no whitespace errors.

### Files Changed

- `services/api/src/research/research-report-parser.ts`
- `services/api/src/research/research-primitives.spec.ts`

### Commit

`49e3937` - `fix: allow unicode research report content`

### Concerns

None.

---

## Reviewer Fix 5 - 2026-07-11

### Status

Rejected deterministic special-use research hostnames for `.test`, `.invalid`,
`.localhost`, `.local`, `.internal`, `.lan`, `.home`, `.corp`, `.home.arpa`,
and `.onion` without DNS or network resolution.

### RED/GREEN Evidence

- RED: `corepack pnpm --filter @nami/api exec tsx --test
  src/research/research-primitives.spec.ts` failed because
  `https://service.test/path` was accepted. Totals: 12 tests, 11 passed, 1
  failed.
- GREEN: research primitives passed 12 tests; research service passed 10 tests;
  full API suite passed 82 tests across 17 suites; API typecheck, secret scan,
  and `git diff --check` passed.

### Commit

`d03953a9b28cec2632a546b17dbbe5900accedc1` -
`fix: reject reserved research hostnames`

### Concerns

None. The policy uses deterministic hostname suffix comparisons only and leaves
normal public domains such as `example.com` allowed.
