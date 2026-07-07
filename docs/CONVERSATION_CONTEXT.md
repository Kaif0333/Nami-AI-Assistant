# Conversation Context

This document summarizes the Nami discussion for Codex.

## Name

The project is named **Nami AI Assistant**. Kaif chose the name because he likes Nami from One Piece.

## Repo

GitHub repo: `Kaif0333/Nami-AI-Assistant`

## Vision

Build a personal JARVIS-like AI assistant that can talk, remember, research, automate, manage jobs/resumes/clients, create documents, use Codex, and eventually watch/control the screen safely.

## Main decisions

- Codex 5.5 is the main builder in VS Code.
- n8n is only for automation workflows.
- Nami custom app is the main brain/system.
- Tauri + Next.js + TypeScript for desktop/dashboard.
- OpenAI Realtime for internal voice.
- Wispr Flow for Kaif's external dictation.
- PostgreSQL + pgvector/Supabase for memory.
- Playwright for browser automation.
- Approval system is mandatory.

## Safety

Nami must ask approval before sending/submitting/deleting/paying/deploying/sharing sensitive data.

Nami must not impersonate Kaif in interviews, bypass CAPTCHA, or secretly monitor.

## Build strategy

Do not build everything at once.

Use phases:
Foundation → Dashboard → Chat → Approvals/logs → Memory → Voice → Research → n8n → Resume/jobs → Email/calendar → Documents → Browser → Screen → Codex builder → Production polish.
