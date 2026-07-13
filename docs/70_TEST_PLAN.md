# 70 — Test Plan

## Goal

Every critical module must be testable.

## Test categories

- Unit tests
- Integration tests
- UI tests
- End-to-end tests
- Manual tests
- Security tests
- Voice tests
- Automation tests
- Screen/control tests

## Minimum before phase completion

- Build passes
- Lint passes
- Relevant tests pass
- No secrets committed
- Approval policy preserved
- Changelog updated

## Current command set

Run the repository-pinned package manager through Corepack:

```bash
corepack pnpm install --frozen-lockfile
corepack pnpm typecheck
corepack pnpm lint
corepack pnpm test
corepack pnpm test:e2e
corepack pnpm smoke:research
corepack pnpm build
```

`corepack pnpm test:e2e` builds the API and web dashboard, starts the real local
API plus a static dashboard server, and runs Playwright browser tests from
`tests/e2e`.

Do not rely on transient `npx` packages for project e2e checks.

`corepack pnpm smoke:research` requires a configured real research provider and
a running API at `NAMI_API_URL` or `http://localhost:4000`. It sends one fast
current-information research request and prints only provider/model/source-count
metadata.

## Phase 6 full gate

Before marking Phase 6 complete, run:

```bash
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
