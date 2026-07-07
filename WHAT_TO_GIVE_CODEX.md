# What to Give Codex

Give Codex this entire folder:

```text
Nami_Codex_Final_Essential_Documentation
```

This is the final clean documentation set.

## Do not give Codex these as separate equal sources

Do not separately provide the older draft packs:

- `nami_codex_documentation_pack.zip`

That older pack is not wrong, but it is superseded by this final folder.

## Included in this final folder

This folder includes:

- Complete Engineering Bible
- Final Supplement Pack
- Final decision docs
- Available chat transcript as supporting context
- Documentation audit report

## First prompt to Codex

Use this:

```text
Read CODEX_START_HERE.md, MASTER_CODEX_PROMPT.md, AGENTS.md, DOCUMENT_INDEX.md, and all files inside docs/. Understand the complete Nami final documentation pack before coding.

This documentation pack is the canonical source. Do not use older duplicate documentation packs.

Start only with Phase 0: Foundation.

Create the project folder structure, root configs, placeholder README files, .env.example, .gitignore, package manager setup, and documentation references. Do not implement AI, voice, n8n, memory, browser, screen, email, calendar, resume, or SaaS features yet.

Follow docs/100_CODEX_LOCAL_EXECUTION_GUIDE.md and docs/101_CODEX_PERMISSION_POLICY.md. Stop after Phase 0 and report folder tree, files created, commands run, tests/checks, assumptions, and next recommended step.
```
