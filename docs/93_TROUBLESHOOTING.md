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
