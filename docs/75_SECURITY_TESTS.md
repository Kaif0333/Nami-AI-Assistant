# 75 — Security Tests

## Tests

- Ensure `.env.local` ignored.
- Ensure `.env.example` has no secrets.
- Run `corepack pnpm check:secrets` for tracked-file secret scanning.
- Run `corepack pnpm check:secrets:history` after any suspected GitHub leak.
- Ensure approval required for send/submit/delete.
- Ensure logs mask secrets.
- Ensure dangerous commands blocked.
- Ensure screen mode has visible indicator.
- Ensure hidden recording is not possible.
- Ensure webhook secret checked.
