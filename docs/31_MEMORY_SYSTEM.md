# 31 — Memory System

## Goal

Nami should remember useful context and retrieve it safely.

## Memory categories

- Profile
- Education/skills
- Projects
- Jobs
- Clients
- Preferences
- Conversations
- Documents
- Automations

## Memory actions

- Save
- Search
- Update
- Delete
- Disable
- Export

## Commands

- "Nami, remember this."
- "Nami, forget this."
- "Nami, what do you remember about my resume?"
- "Nami, update this memory."

## Safety

- Do not store secrets.
- Mark sensitive memories.
- Allow deletion.
- Show memory center.

## Retrieval

Retrieve only relevant memory. Do not flood prompts with all memory.

## Phase 4 implementation

- `GET /api/memories` lists/searches memories.
- `POST /api/memories` saves a memory after secret-like content checks.
- `PATCH /api/memories/:id` updates memory.
- `POST /api/memories/:id/disable` disables memory.
- `DELETE /api/memories/:id` forgets memory.
- `GET /api/memories/vector-status` reports pgvector readiness.
- Dashboard Memory page supports save, search, filters, disable, and delete.
- Database persistence uses Prisma/PostgreSQL when `DATABASE_URL` is configured.
- If no database URL is configured, local dev/tests use an in-memory fallback.
