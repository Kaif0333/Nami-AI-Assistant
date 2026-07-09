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
- OpenAI is the only current voice provider.
- If `OPENAI_API_KEY` is not configured, STT/TTS return a clear setup error and
  no fake transcript or fake audio is generated.
- Voice attempts create action logs with sanitized previews.

## V2

- OpenAI Realtime live voice
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
