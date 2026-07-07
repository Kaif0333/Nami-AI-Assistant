# 99 — Changelog

## [0.4.0] - 2026-07-07

### Added

- Phase 3 approval request model, service, and API endpoints.
- Phase 3 action log model, service, and API endpoints.
- Safe action policy helper for approval-required and blocked actions.
- Safe `demo_send_email` approval-flow endpoint with no real email send.
- Dashboard Approvals page connected to the approval API.
- Dashboard Logs page connected to the action-log API with filters.
- Unit tests for policy, approval, and action-log service logic.

### Changed

- Chat now routes risky commands into approval requests before execution.
- Chat no longer hardcodes OpenAI as the only provider.
- Chat returns a clear provider setup error when no real AI provider is configured.

### Notes

- Approval and action-log persistence is in-memory until the database phase.
- No Phase 4 memory/database work was started.

## [0.3.0] - 2026-07-07

### Added

- Phase 2 NestJS API service under `services/api`.
- `GET /api/health` and `POST /api/chat`.
- Backend-only OpenAI Responses API client using env-based configuration.
- Standard API success/error response envelopes.
- Basic safe request/error logging for chat requests.
- Dashboard Chat page connected to the local API.

### Notes

- Advanced features remain locked for later phases.
- Live OpenAI smoke testing reached the provider but returned a quota/billing
  limit error for the configured key.

## [0.2.2] - 2026-07-07

### Changed

- Documented the `develop` and `main` branch workflow:
  phase work is committed and pushed to `develop`; `main` remains release-only
  until Kaif explicitly approves promotion.

## [0.2.1] - 2026-07-07

### Changed

- Updated the dashboard frontend color palette to Citrus Orange, Soft Citrus,
  Pure White, Off-White, and Ink Black.

## [0.2.0] - 2026-07-07

### Added

- Phase 1 Next.js web dashboard shell under `apps/web-dashboard`.
- Tailwind CSS theme tokens for the Nami command-center UI.
- shadcn-style local UI primitives.
- V1 dashboard pages: Home, Chat, Tasks, Projects, Automations, Approvals, Logs, Settings.
- Tauri v2 desktop shell configuration under `apps/desktop`.
- Root scripts for web and desktop workspace commands through Corepack/pnpm.

### Notes

- Dashboard data is local placeholder UI state only.
- Advanced modules remain unimplemented and locked for later phases.
- Desktop compilation requires Rust, which is not installed on this machine.

## [0.1.0] - 2026-07-07

### Added

- Phase 0 foundation monorepo structure.
- Root `package.json` for pnpm workspaces.
- `pnpm-workspace.yaml`.
- Root configuration placeholders.
- Module placeholder README files.
- Foundation structure and secret hygiene check script.

### Notes

- No advanced Nami features were implemented.
- `.env.example` contains placeholders only.
- `.env.local` remains ignored by Git.

## [0.0.0] — 2026-07-06

### Added

- Complete Nami Engineering Bible documentation pack
- Product Bible
- Vision and scope
- PRD and specification
- Tech stack
- Architecture
- Folder structure
- Module breakdown
- API contracts
- Database schema
- Agent system
- Agent prompts
- Prompt library
- Tool registry
- Voice system
- Memory system
- Research agent
- n8n automation plan
- Screen/computer control plan
- Browser automation plan
- Resume/job assistant plan
- Email/calendar plan
- Document generation plan
- UI/UX plan
- Security and approvals
- Threat model
- Test plan
- Roadmap
- Codex workflow
- Deployment plan
- Troubleshooting
- Final acceptance criteria

### Final decisions

- Nami is a personal JARVIS-like assistant.
- Codex 5.5 is the main builder.
- n8n is automation only.
- Build phase by phase.
- Approval gates are mandatory.
