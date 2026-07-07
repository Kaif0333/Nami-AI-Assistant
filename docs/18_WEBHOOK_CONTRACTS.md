# 18 — Webhook Contracts

## Nami to n8n

Endpoint:
`POST {N8N_WEBHOOK_URL}`

Payload:
```json
{
  "workflowKey": "daily_briefing",
  "requestId": "uuid",
  "source": "nami",
  "input": {},
  "requiresApproval": false
}
```

## n8n to Nami callback

Endpoint:
`POST /api/automations/callback`

Payload:
```json
{
  "requestId": "uuid",
  "workflowKey": "daily_briefing",
  "status": "success|failed",
  "output": {},
  "error": null
}
```

## Security

- Use webhook secret.
- Validate signature/token.
- Log all webhook calls.
- Do not expose public unauthenticated endpoints.
