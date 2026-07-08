# 93 — Troubleshooting

## API key missing

Cause:
- `.env.local` missing or wrong.

Fix:
- Add key locally.
- Restart dev server.

## n8n webhook fails

Cause:
- wrong URL, n8n down, invalid secret.

Fix:
- Check URL.
- Check n8n logs.
- Test webhook manually.

## Database fails

Cause:
- connection string wrong, DB down.

Fix:
- Check DATABASE_URL.
- Start database.
- Run migrations.

## Build fails

Cause:
- dependency issue, TypeScript error.

Fix:
- Read error.
- Fix file.
- Run install/build again.

## pnpm install deprecation warning

Cause:
- An older pnpm version may emit Node.js tooling deprecation warnings.

Fix:
- Use the repository-pinned pnpm version with `corepack pnpm install --frozen-lockfile`.
- Run `corepack pnpm --version` and confirm it matches the root `packageManager`.

## npm or npx project config warnings

Cause:
- pnpm-only settings were placed in `.npmrc`.

Fix:
- Keep pnpm-specific settings in `pnpm-workspace.yaml`.
- Keep `.npmrc` limited to npm-compatible settings.

## Desktop build conflicts with web build

Cause:
- Running all workspace builds in parallel can overlap the root web build with
  the desktop Tauri `beforeBuildCommand`.

Fix:
- Run `corepack pnpm build`, which builds API, web, then desktop sequentially.

## Playwright e2e package resolution fails

Cause:
- Browser tests were run through transient `npx` packages instead of repository
  dev dependencies.

Fix:
- Run `corepack pnpm install --frozen-lockfile`.
- Run `corepack pnpm test:e2e`.

## Voice fails

Cause:
- mic permission, STT/TTS config.

Fix:
- Check permissions.
- Use text fallback.

## Screen control fails

Cause:
- permission or unsupported app.

Fix:
- Use guide mode.
- Use browser/API instead.
