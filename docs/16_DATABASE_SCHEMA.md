# 16 — Database Schema

## Database

PostgreSQL is preferred. Supabase may be used.

## Phase 4 implementation

The implemented schema lives in:

- `services/api/prisma/schema.prisma`
- `services/api/prisma/migrations/20260707161000_phase4_database_memory/migration.sql`
- `services/api/prisma/migrations/20260708065000_enable_supabase_rls/migration.sql`
- `services/api/prisma/migrations/20260710190000_phase6_research/migration.sql`

Use Prisma for schema/types and organized SQL migrations. The Phase 4 migration
enables `pgcrypto` and `vector`, then creates:

- `user_profiles`
- `conversations`
- `messages`
- `approval_requests`
- `action_logs`
- `memories`
- `memory_embeddings`
- `settings`

The RLS hardening migration enables row-level security on all Phase 4 public
schema tables and conditionally revokes `anon`/`authenticated` table access
when those Supabase roles exist. Nami's backend continues to access these
tables through the database owner/service connection; direct public Data API
access must be added later with explicit policies for the exact feature.

Phase 6 adds `ResearchMode`, `ResearchStatus`, `ResearchSourceType`,
`research_runs`, and `research_sources`. The migration enables RLS, conditionally
revokes Supabase public roles, indexes status/mode creation time, indexes source
run IDs and normalized URLs, and enforces `trusted = false` for public research
sources.

Future modules may add the remaining tables from this planning document when
their phases begin.

## Tables

### user_profiles

- id UUID PK
- display_name TEXT
- email TEXT
- education JSONB
- skills JSONB
- preferences JSONB
- created_at TIMESTAMP
- updated_at TIMESTAMP

### conversations

- id UUID PK
- title TEXT
- created_at TIMESTAMP
- updated_at TIMESTAMP

### messages

- id UUID PK
- conversation_id UUID FK
- role TEXT
- content TEXT
- metadata JSONB
- created_at TIMESTAMP

### memories

- id UUID PK
- type TEXT
- title TEXT
- content TEXT
- tags TEXT[]
- source TEXT
- sensitivity TEXT
- created_at TIMESTAMP
- updated_at TIMESTAMP

### memory_embeddings

- id UUID PK
- memory_id UUID FK
- embedding VECTOR
- model TEXT
- created_at TIMESTAMP

### tasks

- id UUID PK
- title TEXT
- description TEXT
- status TEXT
- priority TEXT
- due_date TIMESTAMP
- project_id UUID
- created_at TIMESTAMP
- updated_at TIMESTAMP

### projects

- id UUID PK
- name TEXT
- description TEXT
- status TEXT
- repo_url TEXT
- notes TEXT
- created_at TIMESTAMP
- updated_at TIMESTAMP

### clients

- id UUID PK
- name TEXT
- contact JSONB
- project_summary TEXT
- status TEXT
- follow_up_date TIMESTAMP
- notes TEXT
- created_at TIMESTAMP

### job_applications

- id UUID PK
- company TEXT
- role TEXT
- job_url TEXT
- status TEXT
- resume_version_id UUID
- cover_letter_id UUID
- deadline TIMESTAMP
- notes TEXT
- created_at TIMESTAMP

### approval_requests

- id UUID PK
- action_type TEXT
- summary TEXT
- payload JSONB
- risk_level TEXT
- status TEXT
- created_at TIMESTAMP
- approved_at TIMESTAMP
- rejected_at TIMESTAMP

### action_logs

- id UUID PK
- command TEXT
- action_type TEXT
- status TEXT
- result JSONB
- error JSONB
- created_at TIMESTAMP

### automation_workflows

- id UUID PK
- workflow_key TEXT UNIQUE
- name TEXT
- provider TEXT
- webhook_url TEXT
- status TEXT
- created_at TIMESTAMP
- updated_at TIMESTAMP

### automation_runs

- id UUID PK
- workflow_id UUID FK
- input JSONB
- output JSONB
- status TEXT
- error JSONB
- started_at TIMESTAMP
- completed_at TIMESTAMP

### documents

- id UUID PK
- type TEXT
- title TEXT
- path TEXT
- metadata JSONB
- created_at TIMESTAMP

### settings

- id UUID PK
- key TEXT UNIQUE
- value JSONB
- is_sensitive BOOLEAN
- updated_at TIMESTAMP

### research_runs

- id UUID PK
- query TEXT
- mode ENUM `fast|deep`
- status ENUM `pending|running|completed|partial|failed`
- provider TEXT
- model TEXT
- search_queries TEXT[]
- summary TEXT
- key_findings JSONB
- recommendations JSONB
- risks JSONB
- action_plan JSONB
- warnings TEXT[]
- error_message TEXT
- started_at TIMESTAMP
- completed_at TIMESTAMP
- metadata JSONB
- created_at TIMESTAMP
- updated_at TIMESTAMP

### research_sources

- id UUID PK
- research_run_id UUID FK
- url TEXT
- normalized_url TEXT
- title TEXT
- domain TEXT
- snippet TEXT
- published_at TIMESTAMP
- retrieved_at TIMESTAMP
- source_type ENUM `web|url_context`
- citation_metadata JSONB
- trusted BOOLEAN DEFAULT false
- metadata JSONB
