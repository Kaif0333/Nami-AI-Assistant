# 76 — Voice Tests

## V1 tests

- Push-to-talk button visible.
- Mic permission handled.
- STT error handled.
- TTS error handled.
- Voice logs created.
- Text fallback works.

## Phase 5 automated tests

- `VoiceService` reports push-to-talk safety status without requiring OpenAI configuration.
- Unsupported audio MIME types are rejected before provider calls.
- Missing OpenAI voice configuration returns a setup error and marks the voice log failed.
- STT calls the real OpenAI audio transcription endpoint when configured.
- TTS calls the real OpenAI audio speech endpoint when configured.

## Phase 5 manual/UI checks

- `/voice` loads from the sidebar.
- Voice page shows provider setup state.
- Push-to-talk is the only microphone entry point.
- No wake word or background recording controls exist.
- Text fallback can send a typed message to chat.

## Later tests

- Wake word activates.
- False activations minimized.
- Sleep mode works.
- Stop command works.
- Interruption works.
