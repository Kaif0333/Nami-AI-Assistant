# 105 — CI/CD Pipeline

## Purpose

Define GitHub Actions pipeline for Nami.

## V1 pipeline

On pull request / push:

1. Checkout
2. Setup Node
3. Install dependencies
4. Type check
5. Lint
6. Unit tests
7. Build
8. Secret scan placeholder

## Later pipeline

Add:
- Playwright tests
- Docker build
- Dependency audit
- Code scanning
- Release packaging
- Tauri build
- Artifact upload

## GitHub Actions security

Rules:
- Use minimum permissions.
- Do not expose secrets to pull requests.
- Mask secrets.
- Pin actions to stable versions later.
- Avoid running untrusted scripts.
- Use Dependabot later.
- Do not deploy from random branches.

## Example workflow outline

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:

permissions:
  contents: read

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: npm ci
      - run: npm run typecheck
      - run: npm run lint
      - run: npm test
      - run: npm run build
```

## Release pipeline later

Release only after:
- Tests pass
- Security checks pass
- Version updated
- Changelog updated
- Manual approval
