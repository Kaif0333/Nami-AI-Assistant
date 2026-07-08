# Scripts

Repository maintenance scripts live here.

Current scripts:

- `check-foundation.mjs`: verifies Phase 0 folder structure and secret hygiene.
- `check-secrets.mjs`: verifies tracked files do not contain obvious secrets and
  `.env.local` remains ignored. Run with `--history` for the heavier all-refs
  history scan.
- `cargo-check.mjs`: runs Cargo checks even when a fresh Windows shell has not
  picked up Rust's PATH update yet.
- `with-cargo-env.mjs`: runs desktop/Tauri commands with Cargo's bin directory
  available on PATH.
