import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";

import { ConfigService } from "@nestjs/config";

import { ActionLogsService } from "../action-logs/action-logs.service";
import { SafeActionPolicyService } from "../safety/safe-action-policy.service";
import { VoiceService } from "./voice.service";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("VoiceService", () => {
  it("reports push-to-talk safety status without requiring cloud voice config", () => {
    const { service } = createVoiceService();

    const status = service.getStatus();

    assert.equal(status.mode, "push_to_talk");
    assert.equal(status.stt.provider, "groq");
    assert.equal(status.stt.configured, false);
    assert.equal(status.tts.provider, "browser");
    assert.equal(status.tts.configured, true);
    assert.equal(status.tts.clientSide, true);
    assert.equal(status.safety.pushToTalkOnly, true);
    assert.equal(status.safety.wakeWordEnabled, false);
    assert.equal(status.safety.backgroundRecordingEnabled, false);
  });

  it("rejects unsupported audio before provider calls", async () => {
    const { service } = createVoiceService({ OPENAI_API_KEY: "test-key" });

    await assert.rejects(
      () =>
        service.transcribe({
          audioBase64: Buffer.from("audio").toString("base64"),
          mimeType: "text/plain"
        }),
      /Audio type is not supported/
    );
  });

  it("returns a clear setup error and failed log when STT is not configured", async () => {
    const { actionLogs, service } = createVoiceService();

    await assert.rejects(
      () =>
        service.transcribe({
          audioBase64: Buffer.from("audio").toString("base64"),
          mimeType: "audio/webm",
          durationMs: 1000
        }),
      /Voice provider is not configured/
    );

    const logs = await actionLogs.listActionLogs({
      actionType: "voice_transcription"
    });

    assert.equal(logs.length, 1);
    assert.equal(logs[0].status, "failed");
    assert.equal(logs[0].errorMessage, "Voice STT not configured");
    assert.equal(logs[0].metadata.provider, "groq");
  });

  it("transcribes through the configured Groq audio endpoint", async () => {
    const requestedUrls: string[] = [];
    const { actionLogs, service } = createVoiceService({
      GROQ_API_KEY: "test-key",
      GROQ_STT_MODEL: "whisper-large-v3-turbo"
    });

    globalThis.fetch = (async (url) => {
      requestedUrls.push(url.toString());
      return Response.json({ text: "hello from groq voice" });
    }) as typeof fetch;

    const result = await service.transcribe({
      audioBase64: Buffer.from("audio").toString("base64"),
      mimeType: "audio/webm",
      durationMs: 1200
    });
    const logs = await actionLogs.listActionLogs({
      actionType: "voice_transcription"
    });

    assert.equal(result.transcript, "hello from groq voice");
    assert.equal(result.provider, "groq");
    assert.equal(result.model, "whisper-large-v3-turbo");
    assert.equal(
      requestedUrls[0],
      "https://api.groq.com/openai/v1/audio/transcriptions"
    );
    assert.equal(logs.length, 1);
    assert.equal(logs[0].status, "completed");
    assert.equal(logs[0].metadata.provider, "groq");
  });

  it("transcribes through the configured OpenAI audio endpoint", async () => {
    const requestedUrls: string[] = [];
    const { actionLogs, service } = createVoiceService({
      OPENAI_API_KEY: "test-key",
      OPENAI_STT_MODEL: "gpt-4o-mini-transcribe"
    });

    globalThis.fetch = (async (url) => {
      requestedUrls.push(url.toString());
      return Response.json({ text: "hello from voice" });
    }) as typeof fetch;

    const result = await service.transcribe({
      audioBase64: Buffer.from("audio").toString("base64"),
      mimeType: "audio/webm",
      durationMs: 1200
    });
    const logs = await actionLogs.listActionLogs({
      actionType: "voice_transcription"
    });

    assert.equal(result.transcript, "hello from voice");
    assert.equal(result.provider, "openai");
    assert.equal(result.model, "gpt-4o-mini-transcribe");
    assert.equal(requestedUrls[0], "https://api.openai.com/v1/audio/transcriptions");
    assert.equal(logs.length, 1);
    assert.equal(logs[0].status, "completed");
    assert.equal(logs[0].outputPreview.transcriptCharacters, 16);
  });

  it("synthesizes speech through the configured Groq audio endpoint", async () => {
    const requestedUrls: string[] = [];
    const requestBodies: string[] = [];
    const { actionLogs, service } = createVoiceService({
      GROQ_API_KEY: "test-key",
      GROQ_TTS_MODEL: "canopylabs/orpheus-v1-english",
      GROQ_TTS_VOICE: "hannah"
    });

    globalThis.fetch = (async (url, init) => {
      requestedUrls.push(url.toString());
      requestBodies.push(init?.body?.toString() ?? "");
      return new Response(Buffer.from("wav-data"), {
        headers: { "Content-Type": "audio/wav" },
        status: 200
      });
    }) as typeof fetch;

    const result = await service.synthesize({ text: "Speak this" });
    const logs = await actionLogs.listActionLogs({ actionType: "voice_speech" });

    assert.equal(result.audioBase64, Buffer.from("wav-data").toString("base64"));
    assert.equal(result.mimeType, "audio/wav");
    assert.equal(result.provider, "groq");
    assert.equal(result.model, "canopylabs/orpheus-v1-english");
    assert.equal(result.voice, "hannah");
    assert.equal(result.clientSide, false);
    assert.equal(
      requestedUrls[0],
      "https://api.groq.com/openai/v1/audio/speech"
    );
    assert.match(requestBodies[0], /"response_format":"wav"/);
    assert.equal(logs.length, 1);
    assert.equal(logs[0].status, "completed");
    assert.equal(logs[0].metadata.provider, "groq");
  });

  it("synthesizes speech through the configured OpenAI audio endpoint", async () => {
    const requestedUrls: string[] = [];
    const { actionLogs, service } = createVoiceService({
      OPENAI_API_KEY: "test-key",
      OPENAI_TTS_MODEL: "gpt-4o-mini-tts",
      OPENAI_TTS_VOICE: "alloy"
    });

    globalThis.fetch = (async (url) => {
      requestedUrls.push(url.toString());
      return new Response(Buffer.from("mp3-data"), {
        headers: { "Content-Type": "audio/mpeg" },
        status: 200
      });
    }) as typeof fetch;

    const result = await service.synthesize({ text: "Speak this" });
    const logs = await actionLogs.listActionLogs({ actionType: "voice_speech" });

    assert.equal(result.audioBase64, Buffer.from("mp3-data").toString("base64"));
    assert.equal(result.mimeType, "audio/mpeg");
    assert.equal(result.provider, "openai");
    assert.equal(result.model, "gpt-4o-mini-tts");
    assert.equal(result.clientSide, false);
    assert.equal(requestedUrls[0], "https://api.openai.com/v1/audio/speech");
    assert.equal(logs.length, 1);
    assert.equal(logs[0].status, "completed");
    assert.equal(logs[0].outputPreview.bytes, 8);
  });

  it("returns a browser speech instruction and action log when no cloud TTS is configured", async () => {
    const { actionLogs, service } = createVoiceService();

    const result = await service.synthesize({ text: "Speak locally" });
    const logs = await actionLogs.listActionLogs({ actionType: "voice_speech" });

    assert.equal(result.audioBase64, null);
    assert.equal(result.mimeType, "browser/speech-synthesis");
    assert.equal(result.provider, "browser");
    assert.equal(result.model, "browser-speech-synthesis");
    assert.equal(result.clientSide, true);
    assert.equal(logs.length, 1);
    assert.equal(logs[0].status, "completed");
    assert.equal(logs[0].metadata.provider, "browser");
  });
});

function createVoiceService(config: Record<string, string> = {}) {
  const configService = {
    get(key: string) {
      return config[key];
    }
  } as ConfigService;
  const policy = new SafeActionPolicyService();
  const actionLogs = new ActionLogsService(policy);
  const service = new VoiceService(configService, actionLogs);

  return { actionLogs, service };
}
