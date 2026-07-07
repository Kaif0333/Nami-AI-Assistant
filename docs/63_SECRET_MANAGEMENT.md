# 63 — Secret Management

## Rules

- Real secrets go in `.env.local`.
- `.env.local` must be ignored by Git.
- `.env.example` contains only empty placeholders.
- Logs must mask secrets.
- UI must show secret status, not raw value.
- Never paste secrets into prompts that may be stored.
- Rotate leaked keys.

## Future

Add:
- Local encrypted vault
- OS keychain integration
- Secret manager support
