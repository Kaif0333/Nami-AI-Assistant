# 101 — Codex Permission Policy

## Purpose

This document defines exactly what Codex can and cannot do while building Nami.

## Permission levels

### Level 1 — Read-only

Allowed:
- Read docs
- Inspect file tree
- Read code
- Run `git status`
- Explain plan

Use when:
- Understanding project
- Reviewing code
- Planning phase

### Level 2 — Safe edit

Allowed:
- Create/edit files inside repo
- Create docs
- Create source files
- Add tests
- Add config files
- Run local build/test commands

Use when:
- Building normal phase tasks

### Level 3 — Controlled execution

Allowed with caution:
- Install project dependencies
- Run dev server
- Run Docker Compose
- Run migrations against local/dev DB
- Run Playwright tests

Requires:
- Clear explanation
- No destructive side effects

### Level 4 — Approval required

Must ask Kaif before:
- Delete files/folders
- Install global packages
- Push to GitHub
- Deploy
- Modify system settings
- Run admin commands
- Access files outside repo
- Use production credentials
- Send emails/messages
- Submit forms/applications
- Make paid API calls at scale

### Level 5 — Blocked

Never allowed:
- Bypass CAPTCHA
- Exfiltrate secrets
- Access banking/payment accounts automatically
- Secretly record screen/mic
- Impersonate Kaif in interviews
- Disable security approval system
- Commit `.env.local`
- Upload private data without approval

## Default mode

Default Codex mode should be:

```text
Level 2 Safe Edit + ask before Level 3/4 actions
```

## Review checklist

Before each change Codex must confirm:

- Is this inside repo?
- Is it part of requested phase?
- Does it touch secrets?
- Does it bypass approvals?
- Does it require user approval?
- Can it be tested?
