# 60 — Security and Approvals

## Core rule

Nami must never silently perform risky actions.

## Approval required

- Send email/message
- Submit form/application
- Delete files
- Install/uninstall software
- Run admin/risky command
- Make payment
- Change account settings
- Share personal data
- Push to GitHub
- Deploy
- Start screen control
- Record meeting
- Trigger external workflow that sends/submits/changes data

## Approval data

Each approval request stores:
- id
- actionType
- summary
- description
- payloadPreview
- riskLevel
- status
- requestedBy
- createdAt
- approvedAt
- rejectedAt
- completedAt
- errorMessage
- metadata

Allowed risk levels:
- low
- medium
- high
- blocked

Allowed statuses:
- pending
- approved
- rejected
- expired
- completed
- failed
- cancelled

Phase 3 persistence note:
- Approval records use an in-memory API service store until the database phase.
- Database persistence belongs to Phase 4+ when PostgreSQL/Supabase and Prisma are added.

## Blocked actions

- CAPTCHA bypass
- Credential theft
- Secret recording
- Disabling the approval system
- Interview impersonation
- Secret exfiltration

## Emergency stop

Nami must support a stop action for screen/control/automation modes.

## Secret handling

- Never commit secrets.
- Mask secrets in logs.
- Store real secrets only in `.env.local` or secret manager.
