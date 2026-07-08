# Docker

Docker and Docker Compose assets live here.

Do not store secrets in Docker files.

## Local Phase 4 database

Use the local database compose file when a Supabase PostgreSQL connection string
is not configured yet.

```bash
$env:NAMI_POSTGRES_PASSWORD = "local-only-password"
docker compose -f docker/compose.db.yml up -d
```

Then use a local `DATABASE_URL` like:

```text
postgresql://nami:<local-only-password>@localhost:55432/nami?schema=public
```
