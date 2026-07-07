# 106 — Supply Chain Security

## Purpose

Protect Nami from unsafe dependencies, malicious packages, and risky build scripts.

## Rules

- Use trusted packages.
- Prefer popular, maintained libraries.
- Avoid unknown packages.
- Use lockfiles.
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
