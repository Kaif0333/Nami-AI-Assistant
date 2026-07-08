# 63 — Secret Management

## Rules

- Real secrets go in `.env.local`.
- `.env.local` must be ignored by Git.
- `.env.example` contains only empty placeholders.
- Logs must mask secrets.
- UI must show secret status, not raw value.
- Never paste secrets into prompts that may be stored.
- Rotate leaked keys.
- Run `corepack pnpm check:secrets` before commits.
- Run `corepack pnpm check:secrets:history` when investigating a suspected
  GitHub leak.

## Leak response

If GitHub reports a leaked secret:

- Remove the value from tracked files if present.
- Rotate or revoke the key in the provider dashboard.
- Keep the replacement only in `.env.local` or a secret manager.
- Re-run tracked-file and history secret scans before committing.

## Future

Add:
- Local encrypted vault
- OS keychain integration
- Secret manager support
