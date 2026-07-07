# AGENTS.md — Codex Operating Rules

This file defines how Codex must behave while building Nami.

## Product identity

Nami AI Assistant is Kaif's personal JARVIS-like AI operating system.

Nami should be useful, safe, modular, reliable, and premium. It should not be a random chatbot or experimental script.

## Build philosophy

Use this workflow for every task:

```text
Understand → Plan → Build → Test → Verify → Document → Stop
```

## Fixed decisions

- Project name: Nami AI Assistant
- Automation engine: n8n only for workflows
- Main builder: Codex 5.5
- IDE: VS Code
- Repo: Kaif0333/Nami-AI-Assistant
- Desktop/dashboard: Tauri + Next.js + TypeScript
- UI: Tailwind CSS + shadcn/ui
- Memory: PostgreSQL + pgvector / Supabase
- Browser automation: Playwright
- Internal voice: OpenAI Realtime / STT / TTS
- External dictation for user: Wispr Flow
- Offline STT later: whisper.cpp
- Wake word later: openWakeWord

## Rules

Codex must:

- Read docs before coding.
- Build only the requested phase.
- Prefer simple, working code over overengineering.
- Keep code modular.
- Keep secrets out of Git.
- Use `.env.example` for examples only.
- Add tests for core logic.
- Add logs for important actions.
- Update changelog after meaningful changes.
- Ask before risky/destructive actions.
- Stop when phase is complete.

Codex must not:

- Build unrelated features.
- Change tech stack randomly.
- Delete files without permission.
- Commit API keys.
- Bypass approval requirements.
- Attempt CAPTCHA bypass.
- Build hidden monitoring.
- Build interview impersonation features.
- Add unsafe automation.
- Run unknown remote scripts blindly.

## Approval required

Ask explicit approval before:

- Sending emails/messages
- Submitting forms/applications
- Deleting files
- Running admin commands
- Installing global packages
- Changing system settings
- Pushing to GitHub
- Deploying
- Making payments
- Accessing sensitive accounts
