# 108 — Observability and Tracing

## Purpose

Nami must be debuggable. When something fails, Kaif should know what happened.

## What to track

### Request tracing

- requestId
- user command
- intent
- agent used
- tools called
- approval ID
- result
- error

### Agent tracing

- agent name
- input summary
- decision
- output summary
- confidence
- risk level

### Tool tracing

- tool name
- action
- duration
- status
- error

### Automation tracing

- workflow key
- n8n execution ID
- input
- output
- status

### Cost/usage tracing

- model used
- task type
- token/cost estimate later
- duration

## UI

Logs page should show:

- Commands
- Actions
- Approvals
- Errors
- Automations
- Model/tool usage later

## Error IDs

Every error should have a log ID so Kaif can paste it to Codex/ChatGPT for debugging.

## Later tools

- Sentry
- OpenTelemetry
- Structured JSON logs
- Local log export
