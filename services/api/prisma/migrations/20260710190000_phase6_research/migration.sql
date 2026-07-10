CREATE TYPE "ResearchMode" AS ENUM ('fast', 'deep');
CREATE TYPE "ResearchStatus" AS ENUM ('pending', 'running', 'completed', 'partial', 'failed');

CREATE TABLE "research_runs" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "query" TEXT NOT NULL,
  "mode" "ResearchMode" NOT NULL,
  "status" "ResearchStatus" NOT NULL DEFAULT 'pending',
  "provider" TEXT NOT NULL,
  "model" TEXT NOT NULL,
  "search_queries" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "summary" TEXT NOT NULL DEFAULT '',
  "key_findings" JSONB NOT NULL DEFAULT '[]'::jsonb,
  "recommendations" JSONB NOT NULL DEFAULT '[]'::jsonb,
  "risks" JSONB NOT NULL DEFAULT '[]'::jsonb,
  "action_plan" JSONB NOT NULL DEFAULT '[]'::jsonb,
  "warnings" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "error_message" TEXT,
  "started_at" TIMESTAMPTZ,
  "completed_at" TIMESTAMPTZ,
  "metadata" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE "research_sources" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "research_run_id" UUID NOT NULL REFERENCES "research_runs"("id") ON DELETE CASCADE,
  "url" TEXT NOT NULL,
  "normalized_url" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "domain" TEXT NOT NULL,
  "snippet" TEXT NOT NULL,
  "published_at" TIMESTAMPTZ,
  "retrieved_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "source_type" TEXT NOT NULL,
  "citation_metadata" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "trusted" BOOLEAN NOT NULL DEFAULT false,
  "metadata" JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX "research_runs_status_created_at_idx" ON "research_runs" ("status", "created_at");
CREATE INDEX "research_runs_mode_created_at_idx" ON "research_runs" ("mode", "created_at");
CREATE INDEX "research_sources_research_run_id_idx" ON "research_sources" ("research_run_id");
CREATE INDEX "research_sources_normalized_url_idx" ON "research_sources" ("normalized_url");

ALTER TABLE "research_runs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "research_sources" ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  role_name TEXT;
  table_name TEXT;
  table_names TEXT[] := ARRAY['research_runs', 'research_sources'];
BEGIN
  FOREACH role_name IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = role_name) THEN
      FOREACH table_name IN ARRAY table_names LOOP
        EXECUTE format('REVOKE ALL ON TABLE %I FROM %I', table_name, role_name);
      END LOOP;
    END IF;
  END LOOP;
END $$;
