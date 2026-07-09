# 24 — Model Routing Plan

## Goal

Use the right model for the right task to reduce cost and improve reliability.

## Routing

| Task | Model/tool |
|---|---|
| Simple chat | `AI_FAST_PROVIDER` / `AI_FAST_MODEL` |
| Complex planning | `AI_REASONING_PROVIDER` / `AI_REASONING_MODEL` |
| Coding | `AI_CODING_PROVIDER` / `AI_CODING_MODEL` |
| Live voice | OpenAI Realtime |
| Web research synthesis | `AI_RESEARCH_PROVIDER` / `AI_RESEARCH_MODEL` |
| Resume customization | reasoning model / structured prompts |
| Email draft | fast model unless sensitive |
| Security/verifier | strong reasoning model |
| Offline STT | whisper.cpp |
| Premium TTS | OpenAI TTS / ElevenLabs |

## Current free/free-tier local routing

| Profile | Current choice | Why |
|---|---|---|
| Fast/default chat | Groq `llama-3.1-8b-instant` | Lowest latency in local benchmark. |
| Coding/programming | Groq `llama-3.3-70b-versatile` | Stronger practical code output while still fast on the configured key. |
| Heavy reasoning/planning | Groq `llama-3.3-70b-versatile` | Better quality than 8B for complex work and passed live smoke. |
| Research synthesis | Gemini `gemini-3.1-flash-lite` | Current Gemini model with free-tier availability and long-context fit. |
| Local/private | Ollama `qwen3:4b` | Keeps explicitly local/private requests on the local model. |

OpenRouter free coding candidates such as `qwen/qwen3-coder:free` remain useful
backup options, but local testing saw upstream rate limits. Do not make them the
default route until they are reliable for the configured account.

## Fallback routing

Nami supports real-provider fallback chains for reliability.

```text
AI_CODING_FALLBACKS=openrouter:google/gemini-3.1-flash-lite,gemini:gemini-3.1-flash-lite
AI_REASONING_FALLBACKS=openrouter:google/gemini-3.1-flash-lite,gemini:gemini-3.1-flash-lite
AI_FALLBACKS=
```

Rules:

- Fallback entries use `provider:model`.
- Profile-specific fallback variables win over `AI_FALLBACKS`.
- Fallbacks are used only for real providers.
- If the primary route is unavailable, Nami retries the next configured route.
- If the primary route reports a length stop, Nami retries on the next
  configured route before returning an incomplete answer.
- If every real route fails, Nami returns the provider unavailable error.

## Rules

- Do not use expensive model for every trivial task.
- Use transcripts before video-frame analysis when possible.
- Use screen vision only when needed.
- Track usage later.
- If a selected provider/model and its real fallbacks are unavailable, show the
  provider unavailable error instead of returning a fake response.
- Actual external actions remain behind approval gates regardless of model.
