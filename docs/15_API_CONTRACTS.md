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
    },
    "research": {
      "runId": "uuid",
      "mode": "fast|deep",
      "status": "pending|running|completed|partial|failed",
      "sources": [
        {
          "title": "string",
          "url": "https://example.com/source",
          "domain": "example.com"
        }
      ],
      "warnings": []
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
          "model": "string",
          "research": {
            "runId": "uuid",
            "mode": "fast|deep",
            "status": "completed|partial|failed",
            "sources": [],
            "warnings": []
          }
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
      "provider": "groq",
      "configured": false,
      "model": "whisper-large-v3-turbo",
      "maxAudioBytes": 8388608,
      "supportedMimeTypes": ["audio/webm"]
    },
    "tts": {
      "provider": "groq",
      "configured": false,
      "model": "canopylabs/orpheus-v1-english",
      "voice": "hannah",
      "responseFormat": "wav",
      "fallbackProvider": "browser",
      "clientSide": false
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
      "provider": "groq",
      "model": "whisper-large-v3-turbo",
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
      "audioBase64": "base64-audio-or-null-for-browser-playback",
      "mimeType": "audio/mpeg|audio/wav|browser/speech-synthesis",
      "provider": "groq",
      "model": "canopylabs/orpheus-v1-english",
      "voice": "hannah",
      "clientSide": false
    }
  }
```

Voice provider notes:
- STT providers: `groq`, `openai`.
- TTS providers: `groq`, `openai`, `browser`.
- Browser TTS responses set `clientSide: true`, `audioBase64: null`, and
  `mimeType: "browser/speech-synthesis"`. The dashboard then uses real browser
  speech synthesis; no fake audio is returned.

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

`GET /api/research/status`

Response:
```json
{
  "success": true,
  "data": {
    "provider": "gemini",
    "configured": true,
    "model": "gemini-2.5-flash",
    "supportedModes": ["fast", "deep"],
    "supportsUrlContext": true,
    "maxUrls": 5,
    "requestTimeoutMs": 90000
  }
}
```

`POST /api/research`

Request:
```json
{
  "query": "string",
  "mode": "fast|deep",
  "urls": ["https://example.com/public-page"]
}
```

Response:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "query": "string",
    "mode": "fast|deep",
    "status": "completed|partial|failed",
    "summary": "string",
    "keyFindings": [],
    "recommendations": [],
    "risks": [],
    "actionPlan": [],
    "provider": "gemini",
    "model": "gemini-2.5-flash",
    "searchQueries": [],
    "warnings": [],
    "errorMessage": null,
    "startedAt": "iso-date",
    "completedAt": "iso-date",
    "createdAt": "iso-date",
    "updatedAt": "iso-date",
    "metadata": {},
    "sources": [
      {
        "id": "uuid",
        "researchRunId": "uuid",
        "url": "https://example.com/source",
        "normalizedUrl": "https://example.com/source",
        "title": "string",
        "domain": "example.com",
        "snippet": "string",
        "publishedAt": null,
        "retrievedAt": "iso-date",
        "sourceType": "web|url_context",
        "citationMetadata": {},
        "trusted": false,
        "metadata": {}
      }
    ]
  }
}
```

`GET /api/research`

Optional filters: `mode`, `status`, `query`.

`GET /api/research/:id`

Returns one persisted research run with normalized sources.

Research requests reject local/private URLs, credentials in URLs, non-HTTP(S)
schemes, unsupported ports, and source metadata that resolves to private
addresses. Success requires at least one valid source.

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
