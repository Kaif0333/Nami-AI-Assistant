# API Service

NestJS backend API for Nami.

## Phase 2 ownership

- `GET /api/health`
- `POST /api/chat`
- Backend-only OpenAI Responses API client
- Basic request/error logging
- Standard JSON success/error envelopes

## Run locally

```bash
corepack pnpm dev:api
```

The service defaults to `http://localhost:4000/api`.

Required local secret:

- `OPENAI_API_KEY` in ignored root `.env.local`

Do not commit real secrets.
