# 83 — Phase Prompts

## Phase 0 prompt

Read all docs. Create only the foundation folder structure and config files. Do not implement application features yet. Add placeholder README files in major folders. Ensure `.env.local` is ignored and `.env.example` exists.

## Phase 1 prompt

Build the Nami dashboard using Tauri + Next.js + TypeScript + Tailwind + shadcn/ui. Create only V1 pages: Home, Chat, Tasks, Projects, Automations, Approvals, Logs, Settings. Use the canonical premium citrus command-center UI palette: Citrus Orange `#F97316`, Soft Citrus `#FFEDD5`, Pure White `#FFFFFF`, Off-White `#F9FAFB`, and Ink Black `#111827`. Do not implement AI logic yet.

## Phase 2 prompt

Add backend API and basic chat flow. Use environment variables for API keys. Add error handling and logs. Do not add voice, email, browser, or screen features yet.

## Phase 3 prompt

Implement approval and action log system. Add UI for approval cards. Add safe demo actions only for approval-flow testing. Do not connect real email/submission yet.

## Phase 4 prompt

Implement memory service with PostgreSQL/Supabase schema, UI for saving/searching memories, bounded chat recall, and natural-language memory commands. Prepare pgvector schema for later semantic retrieval without fake embeddings.

## Phase 5 prompt

Implement push-to-talk voice abstraction with real provider routing and explicit setup errors when no real provider is configured. Add UI states. Do not add wake word or background listening yet.

## Phase 6 prompt

Implement research service abstraction with fast/deep modes, real Gemini
grounded search, source storage, safe public URL validation, Research page UI,
chat citations, deterministic e2e coverage, and a real-provider smoke command.
Do not implement browser automation, local file access, document generation, or
n8n workflows in Phase 6.

## Phase 7 prompt

Implement n8n automation bridge with webhook config and test workflow.

## Phase 8 prompt

Implement resume/job assistant with JD analyzer, resume customizer, cover letter draft, and job tracker.

## Phase 9 prompt

Implement email/calendar draft and scheduling features with approval gates.

## Phase 10 prompt

Implement document generation.

## Phase 11 prompt

Implement Playwright browser automation with safe mode and stop-before-submit.

## Phase 12 prompt

Implement screen observe mode first, then guide mode. Do not enable control until approval system is proven.

## Phase 13 prompt

Implement Codex builder module to generate PRDs, tasks, and Codex prompts for other projects.

## Phase 14 prompt

Polish, package, test, backup, release.
