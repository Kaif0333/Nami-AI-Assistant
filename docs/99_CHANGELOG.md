# 99 — Changelog

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
