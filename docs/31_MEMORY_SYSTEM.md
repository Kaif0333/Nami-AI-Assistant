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

## Phase 4.1 chat recall

- Chat now asks the memory service for active saved memories before each normal
  model response.
- Recall is bounded to a small number of relevant matches and a small prompt
  context budget.
- Disabled and archived memories are not recalled.
- Sensitive memories are not injected automatically until an explicit privacy
  control exists.
- Saved memories are treated as user-owned context, not instructions, and must
  not override Nami safety rules.
- Recall currently uses keyword scoring over the memory title, content, source,
  and tags. pgvector semantic retrieval remains ready for a later real
  embedding-provider phase.
- Assistant message metadata stores only recall count and memory IDs, not full
  memory content.

## Phase 4.2 chat memory commands

- Chat can save memories from commands like `remember this: ...`.
- Chat can answer `what do you remember about ...` from active non-sensitive
  memories without calling the AI provider.
- Chat can disable one clearly matched memory from `forget memory about ...`.
- Chat can update one clearly matched non-sensitive memory from
  `update memory about ... to ...`.
- Broad mutation requests like `forget all memories` are blocked and ask for a
  more specific target.
- Secret-like memory content is rejected by the memory service and reported
  safely in chat.
- Memory command attempts create sanitized action logs with no real external
  action.

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
