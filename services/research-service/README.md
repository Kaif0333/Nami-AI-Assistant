# Research Service

Phase 6 research is implemented in `services/api/src/research`.

This folder remains a module boundary placeholder for a future split-out
service. Do not add a second implementation here until the architecture is
explicitly approved.

Current Phase 6 behavior:

- Real Gemini grounded search adapter.
- Fast and deep research modes.
- Optional public URL analysis through Gemini URL Context.
- Prisma persistence for research runs and sources.
- Sanitized action logs for research start/completion/failure.
- Dashboard `/research` page and chat citations.

Research does not read arbitrary local files, drive a browser, submit forms, or
run n8n workflows in Phase 6.
