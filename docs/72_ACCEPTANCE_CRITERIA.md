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
- Unit tests cover memory service behavior.
- Docs and changelog are updated.
