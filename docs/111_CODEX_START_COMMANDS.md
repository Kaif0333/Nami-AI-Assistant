# 111 — Codex Start Commands

## Clone repo

```bash
git clone https://github.com/Kaif0333/Nami-AI-Assistant.git
cd Nami-AI-Assistant
code .
```

## First Codex instruction

Paste this into Codex:

```text
Read MASTER_CODEX_PROMPT.md, AGENTS.md, DOCUMENT_INDEX.md, and all docs. Understand the full Nami Engineering Bible and Final Supplement Pack. Do not write application code yet.

Start only with Phase 0: Foundation.

Create the project folder structure, root configs, placeholder README files, .env.example, .gitignore, package manager setup, and documentation references. Do not implement AI, voice, n8n, memory, browser, screen, email, calendar, or resume features yet.

Follow CODEX_LOCAL_EXECUTION_GUIDE and CODEX_PERMISSION_POLICY. Stop after Phase 0 and report folder tree, files created, commands run, tests/checks, assumptions, and next recommended step.
```

## After Phase 0

Ask Codex:

```text
Review Phase 0 against docs/72_ACCEPTANCE_CRITERIA.md and docs/110_FINAL_PRE_BUILD_CHECKLIST.md. Fix any missing foundation items. Do not start Phase 1 until I approve.
```
