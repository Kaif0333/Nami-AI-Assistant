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
- Supabase RLS hardening on Phase 4 public schema tables
- Basic request/error logging
- Standard JSON success/error envelopes

## Run locally

```bash
corepack pnpm dev:api
```

The service defaults to `http://localhost:4000/api`.

`WEB_DASHBOARD_ORIGIN` supports comma-separated origins. In non-production
mode, `http://localhost:3000` and `http://127.0.0.1:3000` are treated as local
companions when either one is configured.

AI provider behavior:

- Set route variables such as `AI_FAST_PROVIDER`, `AI_CODING_PROVIDER`, and
  `AI_REASONING_PROVIDER` to dedicate providers/models by task profile.
- Add fallback chains with `AI_CODING_FALLBACKS`, `AI_REASONING_FALLBACKS`, or
  `AI_FALLBACKS` using `provider:model,provider:model`.
- Coding, reasoning, research, local/private, and fast chat requests are routed
  before provider execution.
- Keep `AI_PROVIDER` and provider-specific model variables as defaults.
- If no real provider is configured, chat returns a provider setup error.
- OpenAI is reserved for a future provider implementation.
- If a selected provider/model is unavailable or reports a length stop, chat
  retries the next configured real fallback before surfacing an error or
  incomplete result.

Current local free/free-tier recommendation:

```text
AI_FAST_PROVIDER=groq
AI_FAST_MODEL=llama-3.1-8b-instant
AI_CODING_PROVIDER=groq
AI_CODING_MODEL=llama-3.3-70b-versatile
AI_CODING_FALLBACKS=openrouter:google/gemini-3.1-flash-lite,gemini:gemini-3.1-flash-lite
AI_REASONING_PROVIDER=groq
AI_REASONING_MODEL=llama-3.3-70b-versatile
AI_REASONING_FALLBACKS=openrouter:google/gemini-3.1-flash-lite,gemini:gemini-3.1-flash-lite
AI_RESEARCH_PROVIDER=gemini
AI_RESEARCH_MODEL=gemini-3.1-flash-lite
AI_LOCAL_PROVIDER=ollama
AI_LOCAL_MODEL=qwen3:4b
```

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
