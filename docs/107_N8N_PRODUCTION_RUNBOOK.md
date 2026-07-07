# 107 — n8n Production Runbook

## Purpose

Define how to run n8n safely for Nami automations.

## Role of n8n

n8n handles automation workflows only.

## Local setup

V1 can use:
- n8n desktop/cloud/self-host simple setup
- Test webhook
- Manual credentials

## Production setup later

Use:
- Docker Compose
- PostgreSQL database
- Redis queue mode
- Worker processes
- HTTPS
- Webhook secret
- Backups

## Required n8n environment

- `N8N_ENCRYPTION_KEY`
- Database config
- Webhook URL
- Credentials storage
- Timezone
- Auth enabled

## Workflow backup

Export workflows regularly.

Backup:
- n8n database
- credentials encrypted data
- workflow JSON
- environment config

## Failure handling

If workflow fails:
1. Log execution ID.
2. Notify Nami.
3. Show error to user.
4. Retry if safe.
5. Ask approval if action is risky.

## Security rules

- Do not expose unauthenticated webhooks.
- Use secret/token in webhook.
- Do not store API keys in plain docs.
- Keep n8n credentials inside n8n.
- Approval required before send/submit/payment.

## Initial workflows

- Test webhook
- Daily briefing
- Job email tracker
- Client follow-up reminder
- Calendar scheduler
- Google Sheets logging
