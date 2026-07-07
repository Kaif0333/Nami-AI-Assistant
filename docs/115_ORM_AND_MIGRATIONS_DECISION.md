# 115 — ORM and Migrations Decision

## Final decision

Use:

```text
Prisma
```

for database schema and migrations.

## Why

Kaif has limited coding knowledge and Codex will build the project. Prisma provides:

- easier schema management
- readable models
- migrations
- TypeScript types
- good developer experience
- easier onboarding

## Database

Use:

```text
PostgreSQL
```

with Supabase optional.

## Vector memory

For pgvector:
- Use raw SQL migrations where Prisma support is limited.
- Keep vector-specific queries isolated in the memory service.

## Codex rule

Do not create random SQL files everywhere. Keep schema and migrations organized.
