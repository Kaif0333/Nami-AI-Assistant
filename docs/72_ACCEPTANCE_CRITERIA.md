# 72 — Acceptance Criteria

## Phase acceptance template

A phase is complete only when:

- Required files/features exist
- App builds
- Tests pass
- UI works if applicable
- Errors handled
- Logs created
- No secrets committed
- Docs updated
- Changelog updated
- Codex reports what changed

## V1 acceptance

- Dashboard loads
- Sidebar navigation works
- Chat page works
- Settings page works
- Logs page works
- Approval page works
- n8n test config exists
- `.env.example` exists
- `.env.local` ignored

## Phase 3 acceptance

- Approval request model exists with required fields.
- Action log model exists with required fields.
- Safe action policy detects approval-required and blocked actions.
- Risky actions create approval requests before execution.
- Blocked actions cannot be approved.
- Approval API supports list, get, create, approve, and reject.
- Action-log API supports list, get, and create.
- Approvals page shows pending, approved, rejected, risk level, payload preview, and approve/reject controls.
- Logs page shows action logs with filters.
- Safe demo send-email approval does not send any real email.
- Unit tests cover policy, approvals, and action logs.

## Phase 4 acceptance

- Prisma schema and organized migration exist for PostgreSQL/Supabase.
- Migration enables pgvector and creates memory embedding storage.
- Approval requests and action logs can persist to database when configured.
- Local development has a clear in-memory fallback when no `DATABASE_URL` exists.
- Memory API supports list, get, create, update, disable, and delete.
- Memory service rejects obvious secret-like content.
- Memory dashboard supports saving, searching, filtering, disabling, and deleting memories.
- Chat responses can receive bounded, relevant, active, non-sensitive memory context.
- Disabled, archived, and sensitive memories are not automatically injected into chat.
- Chat supports natural-language memory save, search, single-match update, and
  single-match disable commands.
- Broad memory mutation requests are blocked instead of changing many memories.
- Memory command attempts create sanitized action logs.
- Chat conversations and messages persist to database when configured.
- Chat dashboard can list and reopen saved conversations.
- Unit tests cover memory service behavior.
- Docs and changelog are updated.

## Phase 5 acceptance

- Voice page exists and is reachable from dashboard navigation.
- Voice status API reports push-to-talk safety state and provider setup.
- Voice status API reports Groq/OpenAI/browser voice provider routing.
- Push-to-talk starts microphone capture only from explicit user gesture.
- STT endpoint accepts only supported bounded audio clips.
- TTS endpoint accepts bounded text input.
- Completed push-to-talk transcription automatically sends the transcript to chat.
- Nami's chat reply is automatically spoken when TTS or browser fallback is available.
- STT returns clear setup errors when no real cloud STT provider is configured.
- TTS uses real cloud audio when configured or explicit browser speech synthesis fallback.
- No fake transcript, fake spoken audio, wake word, or background recording is implemented.
- Voice attempts create sanitized action logs.
- Text fallback works without voice provider setup.
- Unit tests cover voice status, setup errors, validation, Groq/OpenAI STT, Groq/OpenAI TTS, and browser TTS fallback service logic.
- Docs and changelog are updated.

## Phase 6 acceptance

- Research API exposes status, create, list, and get endpoints.
- Fast and deep research modes exist.
- Research uses real Gemini grounded search; no runtime fake/mock/dummy research
  provider exists.
- `RESEARCH_SEARCH_MODEL` is documented as `gemini-2.5-flash` for the current
  live-tested key.
- Research success requires at least one valid public source.
- Public URL analysis rejects local/private/credentialed/unsupported URLs.
- Research runs and sources persist through Prisma/PostgreSQL when configured.
- Local tests remain deterministic and do not consume external provider quota.
- Dashboard `/research` page supports mode selection, optional URL input,
  structured report display, source links, and recent history reload.
- Chat routes current-information or explicit research requests through
  research after blocked/approval-required checks.
- Chat citations persist when conversations are reopened.
- Research action logs are sanitized.
- `corepack pnpm test:e2e` includes deterministic research page coverage.
- `corepack pnpm smoke:research` passes against the configured real provider.
- Full quality gate, secret checks, docs, and changelog are complete.
- Phase 7 n8n automation has not started.
