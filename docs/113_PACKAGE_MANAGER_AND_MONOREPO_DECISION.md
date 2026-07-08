# 113 — Package Manager and Monorepo Decision

## Final decision

Use:

```text
pnpm + pnpm workspaces
```

Repository pin:

```text
pnpm 11.x through Corepack
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

Use `corepack pnpm ...` for install, test, build, and package commands so local
machines and CI use the same package-manager version.

Project-level pnpm settings belong in `pnpm-workspace.yaml`; keep `.npmrc`
limited to npm-compatible settings so npm and npx do not print project-config
warnings.

Root builds must stay sequential because the Tauri desktop build can trigger the
web dashboard build through its Tauri `beforeBuildCommand`.
