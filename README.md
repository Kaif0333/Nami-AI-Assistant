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

Phase 0 added the foundation for Nami:

- Canonical documentation copied into the root and `docs/`
- pnpm workspace configuration
- Monorepo folders for apps, services, packages, scripts, Docker, and tests
- Placeholder README files for future modules
- `.env.example` with placeholders only
- `.env.local` ignored by Git

No AI chat, voice, memory, n8n, browser automation, screen control,
email/calendar, resume/job workflow, document generation, or deployment feature
was implemented in Phase 0.

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

Advanced tools, voice, n8n, browser/screen control, email/calendar,
resume/job workflows, and document generation remain locked for later approved
phases.

## Phase 4 database and memory foundation

Phase 4 adds the first durable data foundation:

- Prisma 7 schema and migration under `services/api/prisma`.
- PostgreSQL/Supabase-ready models for approvals, action logs, conversations, messages, memories, settings, and pgvector embeddings.
- Database-backed approvals and action logs when `DATABASE_URL` is configured.
- Explicit in-memory fallback for local development/tests without a database URL.
- Memory API for save, search, update, disable, and delete.
- Dashboard Memory page connected to the local API.

Semantic vector search is schema-ready but remains disabled until a real embedding
provider/model is configured. No synthetic embeddings are generated.

## Phase 5 voice

Phase 5 adds the first safe voice loop:

- Voice page in the dashboard.
- `GET /api/voice/status`, `POST /api/voice/transcriptions`, and
  `POST /api/voice/speech`.
- Push-to-talk only; no wake word or background recording.
- Real STT/TTS provider routing for Groq/OpenAI when configured.
- Browser speech synthesis fallback for TTS, explicitly marked as client-side.
- Automatic send after push-to-talk transcription and automatic speech for
  Nami's reply when TTS/browser speech is available.

No fake transcript, fake audio, wake word, or hidden recording was added.

## Phase 6 research

Phase 6 adds source-backed web research:

- `ResearchModule` in the API with fast and deep modes.
- Real Gemini grounded search using `RESEARCH_SEARCH_MODEL`, currently
  `gemini-2.5-flash` after live verification on 2026-07-13.
- Optional explicit public URL analysis through Gemini URL Context.
- Prisma persistence for research runs and normalized source metadata.
- `/research` dashboard page with mode selection, URL input, source display,
  recent history, and detail reload.
- Automatic chat routing for current-information or explicit research requests.
- Chat citations that persist when conversations are reopened.
- Deterministic Playwright coverage plus `corepack pnpm smoke:research` for a
  real provider smoke against a running local API.

Research treats public web content as untrusted data, rejects local/private URLs,
requires at least one valid source for success, and does not implement browser
automation, document generation, n8n workflows, or arbitrary local file access.

## Local verification

Use Corepack so the repository-pinned pnpm version is used:

```bash
corepack pnpm install --frozen-lockfile
corepack pnpm typecheck
corepack pnpm lint
corepack pnpm test
corepack pnpm test:e2e
corepack pnpm build
```

`corepack pnpm build` runs API, web, and desktop builds sequentially. This avoids
the desktop shell starting a web build at the same time as the root web build.

Playwright and the static web server are repository dev dependencies, so e2e
tests should run with `corepack pnpm test:e2e` instead of transient `npx`
packages.

For Phase 6 live research acceptance, start the built API with the repository
root as the working directory, wait for `/api/health`, then run:

```bash
corepack pnpm smoke:research
```

The smoke command uses the configured real Gemini provider and prints only
provider/model/source-count metadata.
