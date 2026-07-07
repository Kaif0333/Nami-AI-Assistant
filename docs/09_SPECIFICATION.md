# 09 — Specification

## System type

Local-first desktop/dashboard app with cloud API integrations.

## Frontend

- Tauri shell
- Next.js app
- TypeScript
- Tailwind CSS
- shadcn/ui

## Backend

- API service
- Agent runtime service
- Memory service
- Automation bridge
- Research service
- Approval service
- Logs service

## Data persistence

- PostgreSQL/Supabase
- pgvector later
- Local config for non-sensitive settings
- `.env.local` for secrets

## Command flow

```text
User command
→ Command router
→ Intent detection
→ Relevant agent
→ Tool call if needed
→ Approval if risky
→ Execute action
→ Verify result
→ Log result
→ Respond to user
```

## Risk levels

- Low: answer, summarize, save note
- Medium: draft email, create event draft, fill form
- High: send, submit, delete, pay, deploy, change settings

## Output expectations

Nami should always provide:
- What it understood
- What it did
- What is needed from user, if any
- Any approval request
- Any error/retry option
