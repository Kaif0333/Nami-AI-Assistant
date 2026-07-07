# 24 — Model Routing Plan

## Goal

Use the right model for the right task to reduce cost and improve reliability.

## Routing

| Task | Model/tool |
|---|---|
| Simple chat | fast lower-cost model |
| Complex planning | GPT-5.5 Thinking |
| Coding | Codex 5.5 |
| Live voice | OpenAI Realtime |
| Web research synthesis | GPT-5.5 Thinking |
| Resume customization | GPT-5.5 / structured prompts |
| Email draft | fast model unless sensitive |
| Security/verifier | strong reasoning model |
| Offline STT | whisper.cpp |
| Premium TTS | OpenAI TTS / ElevenLabs |

## Rules

- Do not use expensive model for every trivial task.
- Use transcripts before video-frame analysis when possible.
- Use screen vision only when needed.
- Track usage later.
