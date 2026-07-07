# Nami AI Assistant

**Nami AI Assistant** is Kaif's personal JARVIS-like AI operating system.

It is designed to become a voice-first, screen-aware, memory-powered, automation-capable AI assistant that can help with research, coding, jobs, resumes, clients, documents, email/calendar, n8n automations, browser workflows, and safe computer control.

## Repository

GitHub repo: `Kaif0333/Nami-AI-Assistant`

## Main decision

Nami is not just a chatbot.

Nami is a modular AI operating system with:

- Desktop/dashboard app
- AI brain and agents
- Voice system
- Memory system
- Research system
- n8n automation bridge
- Email/calendar assistant
- Resume/job assistant
- Client/project assistant
- Document generation
- Browser automation
- Screen/computer-control module
- Approval and security system
- Codex builder module

## How Codex should use this repository

Codex must first read:

1. `MASTER_CODEX_PROMPT.md`
2. `AGENTS.md`
3. `DOCUMENT_INDEX.md`
4. Everything inside `docs/`

Codex must not start coding until it understands the product, roadmap, architecture, safety rules, tests, and final acceptance criteria.

## Non-negotiable build rule

Build phase by phase:

```text
Plan → Build → Test → Fix → Document → Commit → Move to next phase
```

Do not build all features in one prompt.

## Phase 0 foundation

This repository currently contains only the foundation for Nami:

- Canonical documentation copied into the root and `docs/`
- pnpm workspace configuration
- Monorepo folders for apps, services, packages, scripts, Docker, and tests
- Placeholder README files for future modules
- `.env.example` with placeholders only
- `.env.local` ignored by Git

No AI chat, voice, memory, n8n, browser automation, screen control, email/calendar,
resume/job workflow, document generation, or deployment feature is implemented in
Phase 0.

## Phase 1 dashboard shell

Phase 1 adds the first usable dashboard surface:

- `apps/web-dashboard`: Next.js App Router dashboard with TypeScript and Tailwind CSS.
- `apps/desktop`: Tauri v2 shell configuration pointed at the web dashboard.
- V1 pages: Home, Chat, Tasks, Projects, Automations, Approvals, Logs, Settings.
- shadcn-style local UI primitives for cards, buttons, inputs, badges, separators, and tables.

The dashboard remains local and visual only. AI, voice, memory, n8n, browser,
screen, email/calendar, resume/job, and document workflows are still deferred to
later approved phases.

## Phase 2 chat brain

Phase 2 adds the first backend-powered chat flow:

- `services/api`: NestJS API service.
- `GET /api/health`: local API health check.
- `POST /api/chat`: basic Nami chat endpoint.
- Backend-only AI provider abstraction.
- Chat page connected to the local API through `NEXT_PUBLIC_API_URL`.
- Standard API success/error envelopes and safe request/error logs.

Nami uses real AI providers only. If no provider is configured, the API returns
a clear provider setup error instead of a fake assistant reply.

## Phase 3 approval system and action logs

Phase 3 adds reusable safety foundations:

- Approval request model and API.
- Action log model and API.
- Safe action policy for approval-required and blocked actions.
- Dashboard Approvals page with pending, approved, and rejected approvals.
- Dashboard Logs page with action-log filters.
- Safe `demo_send_email` approval-flow test with no real email send.

Database persistence is pending for the database phase. Advanced tools, memory,
voice, n8n, browser/screen control, email/calendar, resume/job workflows, and
document generation remain locked for later approved phases.
