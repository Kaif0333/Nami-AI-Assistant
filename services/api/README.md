# API Service

NestJS backend API for Nami.

## Phase 3 ownership

- `GET /api/health`
- `POST /api/chat`
- `GET /api/approvals`
- `GET /api/approvals/:id`
- `POST /api/approvals`
- `POST /api/approvals/:id/approve`
- `POST /api/approvals/:id/reject`
- `POST /api/approvals/demo-send-email`
- `GET /api/action-logs`
- `GET /api/action-logs/:id`
- `POST /api/action-logs`
- Backend-only real AI provider abstraction
- Safe action policy
- In-memory approval/action-log stores until the database phase
- Basic request/error logging
- Standard JSON success/error envelopes

## Run locally

```bash
corepack pnpm dev:api
```

The service defaults to `http://localhost:4000/api`.

AI provider behavior:

- Set `AI_PROVIDER=ollama` plus `OLLAMA_MODEL` to use local Ollama.
- If no real provider is configured, chat returns a provider setup error.
- OpenAI is reserved for a future provider implementation.

Do not commit real secrets.
