# 16 — Database Schema

## Database

PostgreSQL is preferred. Supabase may be used.

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
