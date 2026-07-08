# 106 — Supply Chain Security

## Purpose

Protect Nami from unsafe dependencies, malicious packages, and risky build scripts.

## Rules

- Use trusted packages.
- Prefer popular, maintained libraries.
- Avoid unknown packages.
- Use lockfiles.
- Use the repository-pinned pnpm version through Corepack.
- Review package names carefully to avoid typosquatting.
- Avoid running random scripts from the internet.
- Do not install global packages unless required.
- Audit dependencies.
- Update dependencies carefully.
- Pin GitHub Actions versions later.
- Use Dependabot later.

## Codex dependency policy

Before adding a dependency, Codex should explain:

```text
Package:
Purpose:
Why needed:
Alternative:
Risk:
```

## High-risk package signs

- Very new package
- Low downloads
- No repository
- Obfuscated code
- Similar name to popular package
- Asks for broad permissions
- Runs postinstall script

## Dependency review checklist

- Is the package necessary?
- Is it maintained?
- Does it have security issues?
- Is there a safer built-in alternative?
- Does it increase bundle size?
- Does it expose user data?

## Build script approvals

pnpm native dependency build scripts must be reviewed and represented in the
`allowBuilds` map in `pnpm-workspace.yaml`.

Approved build scripts are limited to known tooling/native packages required by
the current workspace, such as Prisma engines, esbuild, sharp, and resolver
tooling.

When adding a dependency that needs an install-time build script:

1. Confirm the package is necessary and trusted.
2. Run `corepack pnpm approve-builds` or update `allowBuilds` deliberately.
3. Re-run `corepack pnpm install --frozen-lockfile`.
4. Document the reason in this file or the changelog when meaningful.
