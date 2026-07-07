# 62 — Safe Action Policy

## Low-risk actions

Allowed without approval:
- Answer questions
- Summarize text
- Draft content
- Search memory
- Create local note
- Show weather/time
- Create task

## Medium-risk actions

May require approval depending on context:
- Draft email
- Fill form without submitting
- Create calendar draft
- Generate resume
- Trigger safe n8n workflow

## High-risk actions

Always require approval:
- Send email/message
- Submit form/application
- Delete/edit important files
- Run risky command
- Push/deploy
- Share personal data
- Schedule meeting invite
- Record meeting

## Blocked actions

- Interview impersonation
- CAPTCHA bypass
- Secret exfiltration
- Hidden surveillance
- Unauthorized access
