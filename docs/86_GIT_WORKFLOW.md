# 86 — Git Workflow

## Branching

Protected release branch:
- `main`

Active development branch:
- `develop`

Feature branch format:
- `feature/phase-01-dashboard`
- `feature/memory-service`
- `fix/chat-api-error`

Phase workflow:
- Build and verify each phase on `develop`.
- Commit and push completed phase work to `origin/develop`.
- Do not commit, merge, or push to `main` until Kaif explicitly approves a stable release promotion.
- Keep `main` as the clean release branch for final, verified builds only.

## Commits

Commit format:
- `feat: add dashboard shell`
- `fix: handle missing api key`
- `docs: update roadmap`
- `test: add approval tests`

## Rules

- Do not commit secrets.
- Commit small logical changes.
- Push phase work only to `develop` after checks pass.
- Ask before pushing or merging anything to `main`.
- Use pull requests later if needed.
