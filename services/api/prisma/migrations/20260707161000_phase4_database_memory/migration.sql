CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE "RiskLevel" AS ENUM ('low', 'medium', 'high', 'blocked');
CREATE TYPE "ApprovalStatus" AS ENUM ('pending', 'approved', 'rejected', 'expired', 'completed', 'failed', 'cancelled');
CREATE TYPE "ActionLogStatus" AS ENUM ('planned', 'approval_required', 'approved', 'rejected', 'running', 'completed', 'failed', 'cancelled', 'blocked');
CREATE TYPE "MemoryType" AS ENUM ('profile', 'project', 'job', 'client', 'preference', 'conversation', 'document', 'automation', 'general');
CREATE TYPE "MemorySensitivity" AS ENUM ('public', 'personal', 'sensitive');
CREATE TYPE "MemoryStatus" AS ENUM ('active', 'disabled', 'archived');

CREATE TABLE "user_profiles" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "display_name" TEXT NOT NULL,
  "email" TEXT,
  "education" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "skills" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "preferences" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE "conversations" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "title" TEXT NOT NULL,
  "metadata" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE "messages" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "conversation_id" UUID NOT NULL REFERENCES "conversations"("id") ON DELETE CASCADE,
  "role" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "metadata" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE "approval_requests" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "action_type" TEXT NOT NULL,
  "summary" TEXT NOT NULL,
  "description" TEXT NOT NULL DEFAULT '',
  "payload_preview" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "risk_level" "RiskLevel" NOT NULL,
  "status" "ApprovalStatus" NOT NULL DEFAULT 'pending',
  "requested_by" TEXT NOT NULL DEFAULT 'system',
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "approved_at" TIMESTAMPTZ,
  "rejected_at" TIMESTAMPTZ,
  "completed_at" TIMESTAMPTZ,
  "error_message" TEXT,
  "metadata" JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE "action_logs" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "command_id" TEXT,
  "approval_id" UUID REFERENCES "approval_requests"("id") ON DELETE SET NULL,
  "action_type" TEXT NOT NULL,
  "summary" TEXT NOT NULL,
  "status" "ActionLogStatus" NOT NULL DEFAULT 'planned',
  "risk_level" "RiskLevel" NOT NULL,
  "input_preview" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "output_preview" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "error_message" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "started_at" TIMESTAMPTZ,
  "completed_at" TIMESTAMPTZ,
  "metadata" JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE "memories" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "type" "MemoryType" NOT NULL,
  "title" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "source" TEXT NOT NULL DEFAULT 'manual',
  "sensitivity" "MemorySensitivity" NOT NULL DEFAULT 'personal',
  "status" "MemoryStatus" NOT NULL DEFAULT 'active',
  "metadata" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE "memory_embeddings" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "memory_id" UUID NOT NULL REFERENCES "memories"("id") ON DELETE CASCADE,
  "embedding" vector(1536),
  "model" TEXT NOT NULL,
  "metadata" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE "settings" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "key" TEXT NOT NULL UNIQUE,
  "value" JSONB NOT NULL,
  "is_sensitive" BOOLEAN NOT NULL DEFAULT false,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX "conversations_created_at_idx" ON "conversations" ("created_at");
CREATE INDEX "messages_conversation_id_created_at_idx" ON "messages" ("conversation_id", "created_at");
CREATE INDEX "approval_requests_status_created_at_idx" ON "approval_requests" ("status", "created_at");
CREATE INDEX "approval_requests_risk_level_created_at_idx" ON "approval_requests" ("risk_level", "created_at");
CREATE INDEX "approval_requests_action_type_idx" ON "approval_requests" ("action_type");
CREATE INDEX "action_logs_status_created_at_idx" ON "action_logs" ("status", "created_at");
CREATE INDEX "action_logs_risk_level_created_at_idx" ON "action_logs" ("risk_level", "created_at");
CREATE INDEX "action_logs_action_type_idx" ON "action_logs" ("action_type");
CREATE INDEX "action_logs_approval_id_idx" ON "action_logs" ("approval_id");
CREATE INDEX "memories_type_status_idx" ON "memories" ("type", "status");
CREATE INDEX "memories_sensitivity_status_idx" ON "memories" ("sensitivity", "status");
CREATE INDEX "memories_updated_at_idx" ON "memories" ("updated_at");
CREATE INDEX "memories_tags_gin_idx" ON "memories" USING GIN ("tags");
CREATE INDEX "memory_embeddings_memory_id_idx" ON "memory_embeddings" ("memory_id");
CREATE INDEX "memory_embeddings_embedding_hnsw_idx" ON "memory_embeddings" USING hnsw ("embedding" vector_cosine_ops);
