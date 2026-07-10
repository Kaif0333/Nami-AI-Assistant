# 99 — Changelog

## [0.6.4] - 2026-07-10

### Added

- Phase 4.2 natural-language memory commands in chat.
- `remember this: ...` can save memories directly through `MemoriesService`.
- `what do you remember about ...` can search active non-sensitive memories
  without calling an AI provider.
- `forget memory about ...` disables one clearly matched memory.
- `update memory about ... to ...` updates one clearly matched non-sensitive
  memory.
- Unit tests for memory save, search, forget, broad-forget blocking, update, and
  secret-like content rejection.

### Changed

- Chat UI copy now reflects current memory recall/command capabilities instead
  of the old Phase 2 wording.
- Chat timeline now shows completed local action types such as `memory_save`
  instead of generic action-preview text.

### Safety

- Broad memory mutation requests are blocked.
- Sensitive memories are hidden from chat search and blocked from direct chat
  update until explicit sensitive-memory confirmation controls exist.
- Memory commands create sanitized action logs and perform no external action.

## [0.6.3] - 2026-07-10

### Added

- Phase 4.1 memory recall integration for chat responses.
- Chat now injects a bounded, relevant, active, non-sensitive memory context into
  provider instructions when saved memories match the user request.
- Assistant message metadata now records memory recall count and recalled memory
  IDs without storing full memory content in metadata.
- Unit coverage for chat memory recall, including disabled and sensitive memory
  exclusion.

### Changed

- Chat runtime instructions now reflect the current Phase 5.1 state and no
  longer claim memory recall is unwired.

### Notes

- Recall currently uses keyword scoring. pgvector semantic retrieval remains
  ready for a later real embedding-provider phase.
- Nami still cannot browse the web, read arbitrary local files, or control the
  system until those later gated phases are implemented.

## [0.6.2] - 2026-07-10

### Added

- Automatic voice conversation loop: push-to-talk transcripts now send to chat
  and Nami's reply is spoken back.
- Female-preferred browser speech fallback through `VOICE_BROWSER_TTS_VOICE`.

### Notes

- Push-to-talk remains user-gesture only. Wake word, background listening, and
  realtime voice sessions remain later phases.

## [0.6.1] - 2026-07-09

### Added

- Phase 5.1 voice provider routing for Groq and OpenAI STT/TTS.
- Groq voice defaults for current development: `whisper-large-v3-turbo` STT and
  `canopylabs/orpheus-v1-english` TTS.
- Browser speech synthesis fallback for TTS with backend action-log tracking and
  explicit `clientSide: true` API responses.
- Unit tests for Groq STT/TTS routing and browser TTS fallback.

### Changed

- Voice status now reports selected STT/TTS provider routes, response format,
  and browser fallback state.
- Voice docs and `.env.example` now document the production-ready Voice Gateway
  direction instead of OpenAI-only Phase 5 wiring.

### Notes

- No fake transcript, fake audio, wake word, background recording, or realtime
  voice session was added.
- Gemini Live, OpenAI Realtime, whisper.cpp, and Piper remain later voice lanes.

## [0.6.0] - 2026-07-09

### Added

- Phase 5 push-to-talk Voice page with microphone state, transcript display,
  text fallback, and speech output controls.
- Voice API endpoints for status, bounded audio transcription, and speech
  synthesis.
- OpenAI STT/TTS provider wiring for real voice calls when `OPENAI_API_KEY` and
  voice model config are present.
- Voice service unit tests for status, validation, setup errors, STT, and TTS.

### Changed

- Dashboard navigation and phase status now include Phase 5 Voice.
- API JSON body limit now supports bounded base64 push-to-talk clips, while the
  voice service still enforces its own audio size limit.

### Notes

- No fake transcript or fake audio fallback was added.
- Wake word, background listening, OpenAI Realtime live voice sessions, and
  offline STT/TTS remain later phases.

## [0.5.6] - 2026-07-09

### Added

- Chat conversations now persist user and assistant messages to the existing
  `conversations` and `messages` tables when the database is configured.
- Chat API now exposes conversation list and detail endpoints.
- Chat dashboard now lists saved conversations and can reopen prior message
  history from the sidebar.
- Assistant message metadata now records the provider, model, and task profile
  used for the turn so continuation prompts can keep the right route.
- Unit tests cover fallback chat conversation storage and continuation context.

### Notes

- In-memory chat history remains available only as a no-database fallback for
  tests/local development without `DATABASE_URL`.

## [0.5.5] - 2026-07-09

### Added

- Chat now keeps a bounded per-conversation context window so follow-up prompts
  like `continue` can refer to the previous answer.
- AI routing now supports real-provider fallback chains for unavailable or
  length-truncated primary routes.
- Chat UI now shows an attachment picker state while clearly keeping file
  reading locked until the document/file phase.

### Changed

- Removed Nami's fixed default answer-length cap; explicit env token limits are
  still supported only when configured.
- Chat view auto-scrolls to the latest message.

### Notes

- File/PDF/image ingestion is not implemented yet and no selected files are
  uploaded from chat in this phase.
- Provider/model hard limits still exist; Nami now retries configured real
  fallbacks and auto-continues when truncation is reported.

## [0.5.4] - 2026-07-08

### Added

- Chat model routing for fast, coding, reasoning, research, and local task
  profiles.
- Model-route metadata in chat API responses and dashboard timeline entries.
- Unit tests for task-profile classification and dedicated coding model routing.

### Changed

- Local model-routing docs now use the researched free/free-tier setup:
  Groq fast chat, Groq 70B coding/reasoning, Gemini Flash-Lite research, and
  Ollama local/private routing.
- Chat runtime instructions now reflect the Phase 4 state.

### Notes

- OpenRouter free coding models are documented as backup candidates but are not
  the default route because live testing saw upstream rate limits.
- External actions remain approval-gated regardless of selected model.

## [0.5.3] - 2026-07-08

### Added

- Real Gemini, Groq, and OpenRouter text-provider implementations for chat.
- Provider unit tests for Gemini, Groq, OpenRouter, and unsupported future
  OpenAI behavior.

### Changed

- `.env.example` now documents the currently executable real providers and
  keeps OpenAI as a future placeholder.

### Notes

- Groq `llama-3.1-8b-instant` benchmarked fastest among the configured local
  cloud-provider keys.
- No fake or mock AI fallback was added.

## [0.5.2] - 2026-07-08

### Added

- Repository-owned Playwright e2e test for the Memory page and real local API.
- Root `test:e2e`, `test:all`, and `build:desktop` scripts.

### Changed

- Pinned pnpm to 11.x through Corepack and refreshed the lockfile.
- Root `build` now runs API, web, and desktop builds sequentially.
- `.npmrc` now avoids pnpm-only project config keys that make npm/npx warn.
- pnpm native build-script approvals are recorded in `pnpm-workspace.yaml`.

### Notes

- E2e checks now use repository dev dependencies instead of transient `npx`
  package resolution.
- This is tooling and verification hardening only; no Phase 5 features were
  started.

## [0.5.1] - 2026-07-08

### Added

- Secret scanning script for tracked files and optional Git history checks.
- Supabase RLS hardening migration for Phase 4 public schema tables.

### Changed

- `corepack pnpm check` now includes the tracked-file secret scan.
- Secret management docs now include GitHub leak response steps.

## [0.5.0] - 2026-07-07

### Added

- Phase 4 Prisma/PostgreSQL database foundation.
- Prisma migration for approval requests, action logs, conversations, messages, memories, settings, and pgvector memory embeddings.
- Database service with Prisma 7 PostgreSQL adapter support.
- Memory service and API endpoints for list, get, create, update, disable, delete, and vector status.
- Dashboard Memory page for save/search/filter/disable/delete workflows.
- Unit tests for memory service logic and secret-like memory rejection.

### Changed

- Approval requests and action logs now use database persistence when `DATABASE_URL` is configured.
- Local development and tests use an explicit in-memory fallback when no database URL is configured.
- Dashboard navigation and home state now include Phase 4 Memory.

### Notes

- Semantic vector search is schema-ready but disabled until a real embedding provider is configured.
- No synthetic embeddings or synthetic AI provider logic was added.

## [0.4.0] - 2026-07-07

### Added

- Phase 3 approval request model, service, and API endpoints.
- Phase 3 action log model, service, and API endpoints.
- Safe action policy helper for approval-required and blocked actions.
- Safe `demo_send_email` approval-flow endpoint with no real email send.
- Dashboard Approvals page connected to the approval API.
- Dashboard Logs page connected to the action-log API with filters.
- Unit tests for policy, approval, and action-log service logic.

### Changed

- Chat now routes risky commands into approval requests before execution.
- Chat no longer hardcodes OpenAI as the only provider.
- Chat returns a clear provider setup error when no real AI provider is configured.

### Notes

- Approval and action-log persistence is in-memory until the database phase.
- No Phase 4 memory/database work was started.

## [0.3.0] - 2026-07-07

### Added

- Phase 2 NestJS API service under `services/api`.
- `GET /api/health` and `POST /api/chat`.
- Backend-only OpenAI Responses API client using env-based configuration.
- Standard API success/error response envelopes.
- Basic safe request/error logging for chat requests.
- Dashboard Chat page connected to the local API.

### Notes

- Advanced features remain locked for later phases.
- Live OpenAI smoke testing reached the provider but returned a quota/billing
  limit error for the configured key.

## [0.2.2] - 2026-07-07

### Changed

- Documented the `develop` and `main` branch workflow:
  phase work is committed and pushed to `develop`; `main` remains release-only
  until Kaif explicitly approves promotion.

## [0.2.1] - 2026-07-07

### Changed

- Updated the dashboard frontend color palette to Citrus Orange, Soft Citrus,
  Pure White, Off-White, and Ink Black.

## [0.2.0] - 2026-07-07

### Added

- Phase 1 Next.js web dashboard shell under `apps/web-dashboard`.
- Tailwind CSS theme tokens for the Nami command-center UI.
- shadcn-style local UI primitives.
- V1 dashboard pages: Home, Chat, Tasks, Projects, Automations, Approvals, Logs, Settings.
- Tauri v2 desktop shell configuration under `apps/desktop`.
- Root scripts for web and desktop workspace commands through Corepack/pnpm.

### Notes

- Dashboard data is local placeholder UI state only.
- Advanced modules remain unimplemented and locked for later phases.
- Desktop compilation requires Rust, which is not installed on this machine.

## [0.1.0] - 2026-07-07

### Added

- Phase 0 foundation monorepo structure.
- Root `package.json` for pnpm workspaces.
- `pnpm-workspace.yaml`.
- Root configuration placeholders.
- Module placeholder README files.
- Foundation structure and secret hygiene check script.

### Notes

- No advanced Nami features were implemented.
- `.env.example` contains placeholders only.
- `.env.local` remains ignored by Git.

## [0.0.0] — 2026-07-06

### Added

- Complete Nami Engineering Bible documentation pack
- Product Bible
- Vision and scope
- PRD and specification
- Tech stack
- Architecture
- Folder structure
- Module breakdown
- API contracts
- Database schema
- Agent system
- Agent prompts
- Prompt library
- Tool registry
- Voice system
- Memory system
- Research agent
- n8n automation plan
- Screen/computer control plan
- Browser automation plan
- Resume/job assistant plan
- Email/calendar plan
- Document generation plan
- UI/UX plan
- Security and approvals
- Threat model
- Test plan
- Roadmap
- Codex workflow
- Deployment plan
- Troubleshooting
- Final acceptance criteria

### Final decisions

- Nami is a personal JARVIS-like assistant.
- Codex 5.5 is the main builder.
- n8n is automation only.
- Build phase by phase.
- Approval gates are mandatory.
