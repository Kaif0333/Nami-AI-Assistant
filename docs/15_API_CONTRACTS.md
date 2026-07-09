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
`GET /api/chat/conversations`
`GET /api/chat/conversations/:id`

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
    "actions": [],
    "modelRoute": {
      "taskProfile": "fast|coding|reasoning|research|local",
      "provider": "string",
      "model": "string"
    }
  }
}
```

Conversation list response:
```json
{
  "success": true,
  "data": {
    "conversations": [
      {
        "id": "uuid",
        "title": "string",
        "messageCount": 2,
        "lastMessagePreview": "string",
        "createdAt": "iso-date",
        "updatedAt": "iso-date",
        "metadata": {}
      }
    ]
  }
}
```

Assistant message metadata may include the model route used for that turn. Nami
uses that metadata to keep continuation prompts on the right route when a saved
conversation is reopened.

Conversation detail response:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "title": "string",
    "messages": [
      {
        "id": "uuid",
        "conversationId": "uuid",
        "role": "user|assistant",
        "content": "string",
        "createdAt": "iso-date",
        "metadata": {
          "taskProfile": "fast|coding|reasoning|research|local",
          "provider": "string",
          "model": "string"
        }
      }
    ]
  }
}
```

### Memories

`GET /api/memories`
`GET /api/memories/vector-status`
`GET /api/memories/:id`
`POST /api/memories`
`PATCH /api/memories/:id`
`POST /api/memories/:id/disable`
`DELETE /api/memories/:id`

Create request:
```json
{
  "type": "profile|project|job|client|preference|conversation|document|automation|general",
  "title": "string",
  "content": "string",
  "tags": [],
  "source": "manual",
  "sensitivity": "public|personal|sensitive"
}
```

Response:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "type": "general",
    "title": "string",
    "content": "string",
    "tags": [],
    "source": "manual",
    "sensitivity": "personal",
    "status": "active",
    "hasEmbedding": false,
    "createdAt": "iso-date",
    "updatedAt": "iso-date",
    "metadata": {}
  }
}
```

### Voice

`GET /api/voice/status`
`POST /api/voice/transcriptions`
`POST /api/voice/speech`

Voice V1 is push-to-talk only. Wake word, background listening, and Realtime
speech sessions are not enabled in Phase 5.

Status response:
```json
{
  "success": true,
  "data": {
    "mode": "push_to_talk",
    "stt": {
      "provider": "openai",
      "configured": false,
      "model": "gpt-4o-mini-transcribe",
      "maxAudioBytes": 8388608,
      "supportedMimeTypes": ["audio/webm"]
    },
    "tts": {
      "provider": "openai",
      "configured": false,
      "model": "gpt-4o-mini-tts",
      "voice": "alloy",
      "responseFormat": "mp3"
    },
    "safety": {
      "pushToTalkOnly": true,
      "wakeWordEnabled": false,
      "backgroundRecordingEnabled": false,
      "uploadsRequireUserGesture": true
    }
  }
}
```

Transcription request:
```json
{
  "audioBase64": "base64-audio",
  "mimeType": "audio/webm",
  "fileName": "nami-voice.webm",
  "durationMs": 1200
}
```

Transcription response:
```json
{
  "success": true,
  "data": {
    "transcript": "string",
    "provider": "openai",
    "model": "gpt-4o-mini-transcribe",
    "durationMs": 1200
  }
}
```

Speech request:
```json
{
  "text": "string",
  "voice": "alloy"
}
```

Speech response:
```json
{
  "success": true,
  "data": {
    "audioBase64": "base64-mp3",
    "mimeType": "audio/mpeg",
    "provider": "openai",
    "model": "gpt-4o-mini-tts",
    "voice": "alloy"
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
  "description": "string",
  "payloadPreview": {},
  "riskLevel": "low|medium|high|blocked",
  "requestedBy": "string",
  "metadata": {}
}
```

### Approval decision

`GET /api/approvals`
`GET /api/approvals/:id`
`POST /api/approvals/:id/approve`
`POST /api/approvals/:id/reject`

### Approval demo

`POST /api/approvals/demo-send-email`

Creates a safe demo approval and action log. It does not send email.

### Action logs

`GET /api/action-logs`
`GET /api/action-logs/:id`
`POST /api/action-logs`

Request:
```json
{
  "commandId": "optional",
  "approvalId": "optional",
  "actionType": "send_email",
  "summary": "string",
  "status": "planned|approval_required|approved|rejected|running|completed|failed|cancelled|blocked",
  "riskLevel": "low|medium|high|blocked",
  "inputPreview": {},
  "outputPreview": {},
  "errorMessage": "optional",
  "metadata": {}
}
```

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
