# 113 — Package Manager and Monorepo Decision

## Final decision

Use:

```text
pnpm + pnpm workspaces
```

## Why

- Fast installs
- Good monorepo support
- Common in modern TypeScript projects
- Easier than overengineering immediately with heavy tooling
- Works well with apps/services/packages structure

## Initial setup

Use one root `package.json` with workspaces:

```json
{
  "name": "nami-ai-assistant",
  "private": true,
  "workspaces": [
    "apps/*",
    "services/*",
    "packages/*"
  ]
}
```

## Turborepo decision

Do not add Turborepo in Phase 0 unless needed.

Add Turborepo later only if:
- builds become slow
- caching is needed
- workspace orchestration becomes complex

## Codex rule

Codex must not switch to npm/yarn randomly unless Kaif approves.
