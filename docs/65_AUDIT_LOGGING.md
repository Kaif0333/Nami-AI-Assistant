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

Phase 3 persistence note:
- Action logs use an in-memory API service store until the database phase.
- Previews are sanitized before storage and must not contain full secrets.
