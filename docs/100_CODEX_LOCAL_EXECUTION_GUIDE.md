# 100 — Codex Local Execution Guide

## Purpose

This document tells Codex how to work safely inside Kaif's local VS Code environment while building Nami.

Codex is the main builder, but it must operate inside controlled boundaries.

## Expected environment

- OS: Windows
- IDE: VS Code
- Builder: Codex 5.5 extension / Codex CLI
- Repo: `Kaif0333/Nami-AI-Assistant`
- Local project folder example: `C:\Users\Kaif\Projects\Nami-AI-Assistant`

## Codex working style

Codex must:

1. Read documentation first.
2. Build only the requested phase.
3. Explain plan before major changes.
4. Edit files only inside the repository.
5. Run tests/build after changes.
6. Stop after phase completion.
7. Report changed files and commands.
8. Ask approval before risky commands.

## Allowed local actions

Codex may:

- Create files and folders inside the repo.
- Edit project files.
- Create package files.
- Install local dependencies.
- Run local development commands.
- Run tests.
- Run lint/type checks.
- Create `.env.example`.
- Create placeholder modules.
- Create documentation.
- Create migrations.
- Create Docker files.
- Use Git status/diff/log commands.

## Restricted local actions

Codex must ask before:

- Installing global packages.
- Deleting files/folders.
- Running admin commands.
- Changing PowerShell execution policy.
- Modifying system PATH.
- Accessing files outside the repo.
- Pushing to GitHub.
- Deploying.
- Running unknown downloaded scripts.
- Running commands that may cost money.
- Calling paid APIs repeatedly.

## Recommended command pattern

Before running commands, Codex should explain:

```text
I plan to run:
<command>

Purpose:
<why>

Risk:
<low/medium/high>
```

## Safe command examples

```bash
git status
npm install
npm run build
npm run lint
npm test
pnpm install
pnpm build
docker compose config
```

## Commands requiring approval

```bash
npm install -g ...
rm -rf ...
del /s ...
docker system prune
git push
git reset --hard
Set-ExecutionPolicy ...
```

## Stop rule

After each phase, Codex must stop and report. It must not continue to the next phase automatically.
