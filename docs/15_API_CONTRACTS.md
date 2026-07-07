# 15 — API Contracts

## API principles

- Use JSON.
- Use consistent error format.
- Validate input.
- Log important actions.
- Never expose secrets.

## Standard error format

```json
{
  "success": false,
  "error": {
    "code": "STRING_CODE",
    "message": "Human readable message",
    "details": {}
  }
}
```

## Core endpoints

### Chat

`POST /api/chat`

Request:
```json
{
  "conversationId": "optional",
  "message": "string",
  "mode": "chat"
}
```

Response:
```json
{
  "success": true,
  "data": {
    "reply": "string",
    "conversationId": "string",
    "actions": []
  }
}
```

### Memory save

`POST /api/memory`

Request:
```json
{
  "type": "profile|project|job|client|preference|conversation",
  "title": "string",
  "content": "string",
  "tags": []
}
```

### Memory search

`GET /api/memory/search?q=...`

Response:
```json
{
  "success": true,
  "data": {
    "results": []
  }
}
```

### Approval create

`POST /api/approvals`

Request:
```json
{
  "actionType": "send_email",
  "summary": "string",
  "payload": {},
  "riskLevel": "low|medium|high"
}
```

### Approval decision

`POST /api/approvals/:id/approve`  
`POST /api/approvals/:id/reject`

### n8n trigger

`POST /api/automations/trigger`

Request:
```json
{
  "workflowKey": "daily_briefing",
  "input": {}
}
```

### Research

`POST /api/research`

Request:
```json
{
  "query": "string",
  "mode": "fast|deep"
}
```

### Resume customize

`POST /api/resume/customize`

Request:
```json
{
  "jobDescription": "string",
  "company": "string",
  "role": "string"
}
```

### Email draft

`POST /api/email/draft`

Request:
```json
{
  "to": "string",
  "context": "string",
  "tone": "professional"
}
```

### Calendar schedule

`POST /api/calendar/schedule`

Request:
```json
{
  "title": "string",
  "attendees": [],
  "preferredTime": "string",
  "durationMinutes": 30
}
```
