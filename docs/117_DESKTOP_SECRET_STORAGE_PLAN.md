# 117 — Desktop Secret Storage Plan

## Development

Use:

```text
.env.local
```

for local secrets.

Rules:
- `.env.local` must be ignored by Git.
- `.env.example` contains placeholders only.
- Never print secrets in logs.

## Production desktop

Use one of:

1. OS keychain
2. Tauri secure storage plugin
3. Tauri Stronghold
4. Local encrypted vault

## UI behavior

Settings page should show:

```text
AI provider key: configured
Supabase URL: configured
n8n webhook: missing
```

It should not show raw secret values after saving.

## Rotation

If a key is leaked:
- remove from repo/history if needed
- rotate the key
- update local secret store

## Codex rule

Do not implement custom insecure encryption casually. Use proven storage when moving beyond development.
