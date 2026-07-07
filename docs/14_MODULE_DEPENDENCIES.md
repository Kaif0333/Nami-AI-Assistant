# 14 — Module Dependencies

## Dependency overview

```text
Dashboard depends on API
Chat depends on API + Agent Runtime
Voice depends on Chat + AI Provider
Memory depends on Database
Research depends on AI + Web/Search provider
n8n depends on Automation Bridge
Email/Calendar depends on OAuth + Approval
Resume/Job depends on Memory + Document Generator
Browser Automation depends on Playwright + Approval
Screen Control depends on Screen Capture + Approval
Codex Builder depends on Project/Task modules
```

## Build order

1. Foundation
2. Dashboard
3. API
4. Chat
5. Logs/approvals
6. Memory
7. Voice
8. Research
9. n8n bridge
10. Resume/jobs
11. Email/calendar
12. Browser automation
13. Screen control
14. Codex builder
15. Production polish

## Critical dependency

Approval system must exist before enabling:
- Email send
- Form submit
- Job application submit
- Desktop control
- Git push/deploy
