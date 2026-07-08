# API Service

NestJS backend API for Nami.

## Phase 4 ownership

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
- `GET /api/memories`
- `GET /api/memories/vector-status`
- `GET /api/memories/:id`
- `POST /api/memories`
- `PATCH /api/memories/:id`
- `POST /api/memories/:id/disable`
- `DELETE /api/memories/:id`
- Backend-only real AI provider abstraction
- Safe action policy
- Prisma/PostgreSQL persistence when `DATABASE_URL` is configured
- In-memory fallback for local development/tests without a database URL
- pgvector-ready memory embedding schema
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

Database commands:

```bash
corepack pnpm db:validate
corepack pnpm db:generate
corepack pnpm db:migrate:deploy
```

Set `DATABASE_URL` in `.env.local` for local database persistence. It must be a
PostgreSQL connection string, not the HTTPS `SUPABASE_URL`. Use
`DATABASE_DIRECT_URL` for direct migration access when Supabase provides a
separate direct connection string.

For fallback-only local smoke tests, set `NAMI_SKIP_ENV_FILES=true` so the API
does not load `.env.local`.

Do not commit real secrets.
