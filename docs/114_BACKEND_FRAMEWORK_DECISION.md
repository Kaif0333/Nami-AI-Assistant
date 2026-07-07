# 114 — Backend Framework Decision

## Final decision

Use:

```text
NestJS + TypeScript
```

for the main backend/API service.

## Why

Nami is a large modular assistant with many services:

- Chat
- Agents
- Memory
- Approvals
- Logs
- n8n bridge
- Research
- Jobs/resumes
- Email/calendar
- Browser automation
- Screen control later

NestJS gives:
- structured modules
- dependency injection
- controllers/services
- clean testing patterns
- scalable architecture

## Alternative

Fastify is lighter, but NestJS is better for a complex final product.

## Codex rule

Use NestJS for `services/api` unless there is a major technical reason and Kaif approves.
