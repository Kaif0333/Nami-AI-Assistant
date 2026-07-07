# 19 — Event System

## Purpose

Nami should use internal events for modular workflows.

## Example events

- command.received
- command.planned
- approval.requested
- approval.approved
- approval.rejected
- action.started
- action.completed
- action.failed
- memory.saved
- automation.triggered
- automation.completed
- email.draft_created
- job.resume_customized

## Event payload

```json
{
  "id": "uuid",
  "type": "command.received",
  "timestamp": "iso",
  "actor": "user|nami|system",
  "payload": {}
}
```

## Usage

Events support:
- Logs
- UI activity timeline
- Debugging
- Future automation triggers
