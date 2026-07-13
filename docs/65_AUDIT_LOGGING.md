# 65 — Audit Logging

## What to log

- Commands
- Agent decisions
- Approval requests
- Approvals/rejections
- Actions executed
- Automation runs
- Errors
- Tool calls metadata
- File/document generation
- Research web runs and URL research attempts

## What not to log

- Full API keys
- Passwords
- Private tokens
- Sensitive raw data unless needed and approved

## Log fields

- id
- commandId
- approvalId
- actionType
- summary
- status
- riskLevel
- inputPreview
- outputPreview
- errorMessage
- createdAt
- startedAt
- completedAt
- metadata

Allowed statuses:
- planned
- approval_required
- approved
- rejected
- running
- completed
- failed
- cancelled
- blocked

Phase 4 persistence note:
- Action logs persist through Prisma/PostgreSQL when `DATABASE_URL` is configured.
- Local development and tests may use the in-memory fallback when no database URL is configured.
- Previews are sanitized before storage and must not contain full secrets.

Phase 6 research logging:

- `research_web`
- `research_url`
- `research_completed`
- `research_failed`

Research log metadata may include mode, provider, model, run ID, source count,
warning count, and duration. It must not include API keys, full copied pages, or
unsanitized secret-like query/source text.
