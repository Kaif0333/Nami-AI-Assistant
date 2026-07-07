# 11 — Architecture

## System diagram

```text
Nami Desktop App
  ↓
Nami API Service
  ↓
Command Router
  ↓
Agent Runtime
  ↓
Tool Router
  ├── Memory Service
  ├── Research Service
  ├── n8n Automation Bridge
  ├── Email/Calendar Service
  ├── Resume/Job Service
  ├── Document Service
  ├── Browser Agent
  ├── Screen Agent
  ├── Codex Builder Module
  └── Approval Service
  ↓
Logs + Database
```

## Architectural principles

- Separate UI from business logic.
- Separate AI reasoning from action execution.
- All risky actions pass through approval service.
- Prefer APIs over screen clicking.
- Prefer browser automation over raw mouse control.
- Use logs for traceability.
- Keep modules replaceable.

## Reliability priority

```text
Official API > n8n workflow > Playwright browser automation > desktop automation > screen vision clicking
```

## Deployment style

V1 local development:
- Desktop app
- Local API
- Local/supabase database
- Optional local n8n

Later:
- Dockerized services
- Packaged desktop app
- Self-hosted n8n
