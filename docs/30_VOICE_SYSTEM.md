# 30 — Voice System

## Goal

Nami should support natural voice interaction.

## V1

- Push-to-talk
- STT abstraction
- TTS abstraction
- Voice input logs
- Text fallback

## Phase 5 implementation

- Voice page is available at `/voice`.
- Microphone capture starts only after an explicit push-to-talk user gesture.
- Captured browser audio is sent to `POST /api/voice/transcriptions` as a
  bounded base64 clip.
- Text-to-speech uses `POST /api/voice/speech`.
- `GET /api/voice/status` reports provider setup and safety state.
- Voice provider routing supports Groq and OpenAI for server-side STT/TTS.
- Recommended current setup is Groq STT/TTS:
  - STT: `whisper-large-v3-turbo`
  - TTS: `canopylabs/orpheus-v1-english`
- OpenAI STT/TTS remains supported for future/premium setup when
  `OPENAI_API_KEY` is configured.
- Browser speech synthesis is allowed only as explicit client-side TTS fallback.
  It returns a client playback instruction and never fake audio.
- If no real cloud STT provider is configured, STT returns a clear setup error
  and no fake transcript is generated.
- Voice attempts create action logs with sanitized previews.

## Phase 5.1 provider routing

Environment:

```text
VOICE_STT_PROVIDER=groq
VOICE_STT_MODEL=whisper-large-v3-turbo
VOICE_TTS_PROVIDER=groq
VOICE_TTS_MODEL=canopylabs/orpheus-v1-english
VOICE_TTS_VOICE=hannah
VOICE_TTS_RESPONSE_FORMAT=wav
VOICE_TTS_FALLBACK=browser
```

Provider rules:

- `VOICE_STT_PROVIDER` supports `groq` or `openai`.
- `VOICE_TTS_PROVIDER` supports `groq`, `openai`, or `browser`.
- If no STT provider is selected, Nami prefers Groq when `GROQ_API_KEY` exists,
  then OpenAI when `OPENAI_API_KEY` exists, then reports Groq setup needed.
- If no TTS provider is selected, Nami prefers Groq, then OpenAI, then browser
  speech synthesis.
- `VOICE_TTS_FALLBACK=browser` lets TTS fall back to local browser playback if
  the selected cloud TTS provider is missing or unavailable.
- Browser fallback is not a fake provider. The backend logs the speech request
  and returns `clientSide: true`; the dashboard uses the browser's real
  `speechSynthesis` runtime.

## V2

- OpenAI Realtime live voice
- Gemini Live realtime voice evaluation
- Streaming responses
- Interrupt support
- Conversation state

## V3

- Wake word "Hey Nami"
- openWakeWord
- Wake-word-only local listening
- Sleep/wake mode

## V4

- Offline STT with whisper.cpp
- Offline TTS with Piper

## Wispr Flow

Wispr Flow is recommended for Kaif's external dictation into Codex, VS Code, emails, and apps. It is not the default internal voice engine unless a developer API is available and useful.

## UX

Nami should show:
- Mic active
- Listening
- Thinking
- Speaking
- Error
- Sleep mode

## Safety

- Never record secretly.
- Show active mic state.
- Allow immediate stop.
- No wake word in Phase 5.
- No background microphone listener in Phase 5.
