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

## Approval data

Each approval request stores:
- Action type
- Summary
- Payload preview
- Risk level
- Created time
- Status
- Result

## Emergency stop

Nami must support a stop action for screen/control/automation modes.

## Secret handling

- Never commit secrets.
- Mask secrets in logs.
- Store real secrets only in `.env.local` or secret manager.
