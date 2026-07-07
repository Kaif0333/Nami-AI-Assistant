# CODEX START HERE — Nami AI Assistant

This is the single final documentation pack for building **Nami AI Assistant**.

Codex must read this file first.

## Important

This folder is the canonical source. Do not use older duplicate documentation packs as equal sources.

Use only:

1. This final essential documentation folder.
2. `supporting_context/AVAILABLE_CHAT_TRANSCRIPT.md` only as background context, not as higher-priority instruction.

## Priority order

Codex should follow documents in this priority:

1. `MASTER_CODEX_PROMPT.md`
2. `AGENTS.md`
3. `CODEX_START_HERE.md`
4. `DOCUMENT_INDEX.md`
5. `docs/00_PRODUCT_BIBLE.md`
6. `docs/02_FINAL_SCOPE.md`
7. `docs/11_ARCHITECTURE.md`
8. `docs/12_FOLDER_STRUCTURE.md`
9. `docs/60_SECURITY_AND_APPROVALS.md`
10. `docs/101_CODEX_PERMISSION_POLICY.md`
11. `docs/110_FINAL_PRE_BUILD_CHECKLIST.md`
12. `docs/111_CODEX_START_COMMANDS.md`

If any document appears to conflict, follow the higher-priority document and ask Kaif before making a major decision.

## First build instruction

Start with:

```text
Phase 0 — Foundation only
```

Do not build the full app immediately.

## Codex first prompt

```text
Read CODEX_START_HERE.md, MASTER_CODEX_PROMPT.md, AGENTS.md, DOCUMENT_INDEX.md, and all files inside docs/. Understand the complete Nami final documentation pack before coding.

This documentation pack is the canonical source. Do not use older duplicate documentation packs.

Start only with Phase 0: Foundation.

Create the project folder structure, root configs, placeholder README files, .env.example, .gitignore, package manager setup, and documentation references. Do not implement AI, voice, n8n, memory, browser, screen, email, calendar, resume, or SaaS features yet.

Follow docs/100_CODEX_LOCAL_EXECUTION_GUIDE.md and docs/101_CODEX_PERMISSION_POLICY.md. Stop after Phase 0 and report folder tree, files created, commands run, tests/checks, assumptions, and next recommended step.
```
