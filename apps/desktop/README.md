# Desktop App

Tauri desktop shell for Nami.

Current Phase 1 scope:

- Tauri v2 config and minimal Rust entrypoints.
- Desktop window pointed at the `apps/web-dashboard` Next.js app.
- Static production output expected at `apps/web-dashboard/out`.

Rust and Visual Studio C++ Build Tools are required before
`pnpm --filter @nami/desktop dev` or `build` can compile locally. Desktop
typecheck now runs `cargo check` against the Tauri crate.
