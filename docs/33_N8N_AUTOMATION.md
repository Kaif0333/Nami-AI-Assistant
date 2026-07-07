# 33 — n8n Automation

## Decision

n8n is the automation engine only.

## Responsibilities

n8n handles:
- Triggers
- Scheduled workflows
- Gmail workflows
- Calendar workflows
- Google Sheets updates
- Notifications
- Webhooks
- Client follow-ups
- Job tracker automations

n8n does not handle:
- Main AI brain
- Voice
- Screen
- Memory core
- Dashboard
- Computer control

## Integration

Nami calls n8n via webhook. n8n can call Nami back.

## Security

- Use webhook secret.
- Store n8n credentials inside n8n.
- Approval required before risky send/submit actions.
