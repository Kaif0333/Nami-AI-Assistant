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
- timestamp
- user command
- action type
- status
- risk level
- approval id
- error
- metadata
