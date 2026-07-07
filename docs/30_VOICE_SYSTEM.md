# 30 — Voice System

## Goal

Nami should support natural voice interaction.

## V1

- Push-to-talk
- STT abstraction
- TTS abstraction
- Voice input logs
- Text fallback

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
