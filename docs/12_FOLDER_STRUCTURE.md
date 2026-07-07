# 12 — Folder Structure

Codex must follow this folder structure unless a strong documented reason exists.

```text
Nami-AI-Assistant/
│
├── apps/
│   ├── desktop/
│   └── web-dashboard/
│
├── services/
│   ├── api/
│   ├── agent-runtime/
│   ├── memory-service/
│   ├── voice-service/
│   ├── automation-bridge/
│   ├── research-service/
│   ├── browser-agent/
│   ├── computer-agent/
│   └── document-agent/
│
├── packages/
│   ├── ui/
│   ├── types/
│   ├── shared/
│   ├── prompts/
│   ├── security/
│   └── config/
│
├── docs/
├── scripts/
├── docker/
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
│
├── .env.example
├── .gitignore
├── AGENTS.md
├── MASTER_CODEX_PROMPT.md
├── DOCUMENT_INDEX.md
├── README.md
└── package.json
```

## Rules

- UI components go in `packages/ui`.
- Shared types go in `packages/types`.
- Agent prompts go in `packages/prompts`.
- Backend logic goes in `services/api`.
- AI agent orchestration goes in `services/agent-runtime`.
- n8n bridge goes in `services/automation-bridge`.
- Browser automation goes in `services/browser-agent`.
- Desktop control goes in `services/computer-agent`.
