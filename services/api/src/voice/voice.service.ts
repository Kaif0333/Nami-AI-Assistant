import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  ServiceUnavailableException
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import { ActionLogsService } from "../action-logs/action-logs.service";
import type { ActionLog } from "../action-logs/action-log.types";
import { TranscribeVoiceDto } from "./dto/transcribe-voice.dto";
import { SynthesizeVoiceDto } from "./dto/synthesize-voice.dto";
import {
  VoiceSpeechResult,
  VoiceStatus,
  VoiceTranscriptionResult,
  type SttProvider,
  type TtsProvider
} from "./voice.types";

type TranscriptionResponse = {
  text?: string;
};

const audioProviderConfig = {
  openai: {
    apiKeyEnv: "OPENAI_API_KEY",
    audioBaseUrl: "https://api.openai.com/v1/audio"
  },
  groq: {
    apiKeyEnv: "GROQ_API_KEY",
    audioBaseUrl: "https://api.groq.com/openai/v1/audio"
  }
} as const satisfies Record<
  SttProvider,
  {
    apiKeyEnv: string;
    audioBaseUrl: string;
  }
>;

const supportedSttMimeTypes = [
  "audio/flac",
  "audio/mpeg",
  "audio/mp3",
  "audio/mp4",
  "audio/mpga",
  "audio/m4a",
  "audio/ogg",
  "audio/wav",
  "audio/webm",
  "video/mp4",
  "video/webm"
];
const defaultMaxAudioBytes = 8 * 1024 * 1024;
const defaultOpenAiSttModel = "gpt-4o-mini-transcribe";
const defaultOpenAiTtsModel = "gpt-4o-mini-tts";
const defaultOpenAiVoice = "alloy";
const defaultGroqSttModel = "whisper-large-v3-turbo";
const defaultGroqTtsModel = "canopylabs/orpheus-v1-english";
const defaultGroqVoice = "hannah";
const browserTtsModel = "browser-speech-synthesis";
const browserTtsVoice = "system";

@Injectable()
export class VoiceService {
  private readonly logger = new Logger(VoiceService.name);

  constructor(
    @Inject(ConfigService)
    private readonly config: ConfigService,
    @Inject(ActionLogsService)
    private readonly actionLogsService: ActionLogsService
  ) {}

  getStatus(): VoiceStatus {
    const sttProvider = this.getSttProvider();
    const ttsProvider = this.getTtsProvider();
    const ttsConfigured = this.isTtsConfigured(ttsProvider);
    const browserFallback = this.getBrowserTtsFallback(ttsProvider);

    return {
      mode: "push_to_talk",
      stt: {
        provider: sttProvider,
        configured: this.isSttConfigured(sttProvider),
        model: this.getSttModel(sttProvider),
        maxAudioBytes: this.getMaxAudioBytes(),
        supportedMimeTypes: supportedSttMimeTypes
      },
      tts: {
        provider: ttsProvider,
        configured: ttsConfigured,
        model: this.getTtsModel(ttsProvider),
        voice: this.getTtsVoice(ttsProvider),
        responseFormat: this.getTtsResponseFormat(ttsProvider),
        fallbackProvider: browserFallback,
        clientSide: ttsProvider === "browser"
      },
      realtime: {
        configured: false,
        model:
          this.config.get<string>("OPENAI_REALTIME_MODEL")?.trim() ||
          this.config.get<string>("GEMINI_LIVE_MODEL")?.trim() ||
          "",
        status: "planned_later"
      },
      safety: {
        pushToTalkOnly: true,
        wakeWordEnabled: false,
        backgroundRecordingEnabled: false,
        uploadsRequireUserGesture: true
      }
    };
  }

  async transcribe(input: TranscribeVoiceDto): Promise<VoiceTranscriptionResult> {
    const audio = this.decodeAudio(input);
    const provider = this.getSttProvider();
    const model = this.getSttModel(provider);

    const log = await this.actionLogsService.createActionLog({
      actionType: "voice_transcription",
      summary: "Voice transcription requested",
      status: "running",
      riskLevel: "low",
      inputPreview: {
        mimeType: input.mimeType,
        fileName: input.fileName,
        bytes: audio.byteLength,
        durationMs: input.durationMs
      },
      metadata: {
        source: "voice",
        provider,
        model,
        pushToTalkOnly: true,
        realExternalAction: false
      }
    });

    if (!this.isSttConfigured(provider)) {
      await this.markVoiceFailure(log, "Voice STT not configured", {
        provider,
        mimeType: input.mimeType,
        bytes: audio.byteLength
      });
      throw this.providerNotConfigured("stt", provider);
    }

    const formData = new FormData();
    const fileName = safeFileName(input.fileName, input.mimeType);

    formData.set("model", model);
    formData.set("file", new Blob([audio], { type: input.mimeType }), fileName);

    try {
      const response = await fetch(
        `${audioProviderConfig[provider].audioBaseUrl}/transcriptions`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.getProviderApiKey(provider)}`
          },
          body: formData
        }
      );

      if (!response.ok) {
        this.logger.warn(`voice.stt_unavailable status=${response.status}`);
        await this.markVoiceFailure(log, "Voice STT provider request failed", {
          provider,
          status: response.status,
          model
        });
        throw this.providerUnavailable("stt", provider);
      }

      const payload = (await response.json()) as TranscriptionResponse;
      const transcript = payload.text?.trim();

      if (!transcript) {
        await this.markVoiceFailure(
          log,
          "Voice STT provider returned no transcript",
          { provider, model }
        );
        throw this.providerUnavailable("stt", provider);
      }

      await this.actionLogsService.updateActionLog(log.id, {
        status: "completed",
        outputPreview: {
          transcriptPreview: transcript.slice(0, 160),
          transcriptCharacters: transcript.length
        },
        metadata: {
          ...log.metadata,
          provider,
          model,
          pushToTalkOnly: true,
          realExternalAction: false
        }
      });

      return {
        transcript,
        provider,
        model,
        durationMs: input.durationMs
      };
    } catch (error) {
      if (error instanceof ServiceUnavailableException) {
        throw error;
      }

      this.logger.warn(
        `voice.stt_request_failed message=${error instanceof Error ? error.message : "unknown"}`
      );
      await this.markVoiceFailure(log, "Voice STT failed", {
        provider,
        model
      });
      throw this.providerUnavailable("stt", provider);
    }
  }

  async synthesize(input: SynthesizeVoiceDto): Promise<VoiceSpeechResult> {
    const text = input.text.trim();

    if (!text) {
      throw new BadRequestException({
        code: "VOICE_TEXT_REQUIRED",
        message: "Text is required for voice synthesis.",
        details: {}
      });
    }

    const log = await this.actionLogsService.createActionLog({
      actionType: "voice_speech",
      summary: "Voice speech synthesis requested",
      status: "running",
      riskLevel: "low",
      inputPreview: {
        characters: text.length,
        voice: input.voice ?? this.getTtsVoice(this.getTtsProvider())
      },
      metadata: {
        source: "voice",
        provider: this.getTtsProvider(),
        realExternalAction: false
      }
    });

    const provider = this.getTtsProvider();
    const model = this.getTtsModel(provider);
    const voice = input.voice?.trim() || this.getTtsVoice(provider);

    if (provider === "browser") {
      return this.completeBrowserSpeech(log, voice);
    }

    if (!this.isTtsConfigured(provider)) {
      const fallback = this.getBrowserTtsFallback(provider);

      if (fallback === "browser") {
        return this.completeBrowserSpeech(log, browserTtsVoice, {
          failedProvider: provider,
          failedModel: model,
          reason: "provider_not_configured"
        });
      }

      await this.markVoiceFailure(log, "Voice TTS not configured", {
        provider,
        characters: text.length
      });
      throw this.providerNotConfigured("tts", provider);
    }

    const responseFormat = this.getTtsResponseFormat(provider);

    if (responseFormat === "browser") {
      return this.completeBrowserSpeech(log, browserTtsVoice);
    }

    try {
      const response = await fetch(`${audioProviderConfig[provider].audioBaseUrl}/speech`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.getProviderApiKey(provider)}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model,
          voice,
          input: text,
          response_format: responseFormat
        })
      });

      if (!response.ok) {
        this.logger.warn(`voice.tts_unavailable status=${response.status}`);
        const fallback = this.getBrowserTtsFallback(provider);

        if (fallback === "browser") {
          return this.completeBrowserSpeech(log, browserTtsVoice, {
            failedProvider: provider,
            failedModel: model,
            status: response.status,
            reason: "provider_unavailable"
          });
        }

        await this.markVoiceFailure(log, "Voice TTS provider request failed", {
          provider,
          status: response.status,
          model,
          voice
        });
        throw this.providerUnavailable("tts", provider);
      }

      const audioBuffer = Buffer.from(await response.arrayBuffer());
      const audioBase64 = audioBuffer.toString("base64");
      const mimeType = mimeTypeForResponseFormat(responseFormat);

      await this.actionLogsService.updateActionLog(log.id, {
        status: "completed",
        outputPreview: {
          bytes: audioBuffer.byteLength,
          mimeType
        },
        metadata: {
          ...log.metadata,
          provider,
          model,
          voice,
          responseFormat,
          realExternalAction: false
        }
      });

      return {
        audioBase64,
        mimeType,
        provider,
        model,
        voice,
        clientSide: false
      };
    } catch (error) {
      if (error instanceof ServiceUnavailableException) {
        throw error;
      }

      this.logger.warn(
        `voice.tts_request_failed message=${error instanceof Error ? error.message : "unknown"}`
      );
      const fallback = this.getBrowserTtsFallback(provider);

      if (fallback === "browser") {
        return this.completeBrowserSpeech(log, browserTtsVoice, {
          failedProvider: provider,
          failedModel: model,
          reason: "provider_request_failed"
        });
      }

      await this.markVoiceFailure(log, "Voice TTS failed", {
        provider,
        model,
        voice
      });
      throw this.providerUnavailable("tts", provider);
    }
  }

  private decodeAudio(input: TranscribeVoiceDto) {
    const mimeType = input.mimeType.trim().toLowerCase();

    if (!supportedSttMimeTypes.includes(mimeType)) {
      throw new BadRequestException({
        code: "VOICE_AUDIO_TYPE_UNSUPPORTED",
        message: "Audio type is not supported for voice transcription.",
        details: { mimeType, supportedMimeTypes: supportedSttMimeTypes }
      });
    }

    const audio = Buffer.from(input.audioBase64, "base64");

    if (!audio.byteLength) {
      throw new BadRequestException({
        code: "VOICE_AUDIO_REQUIRED",
        message: "Audio data is required for voice transcription.",
        details: {}
      });
    }

    if (audio.byteLength > this.getMaxAudioBytes()) {
      throw new BadRequestException({
        code: "VOICE_AUDIO_TOO_LARGE",
        message: "Audio clip is too large for Phase 5 push-to-talk.",
        details: {
          bytes: audio.byteLength,
          maxAudioBytes: this.getMaxAudioBytes()
        }
      });
    }

    return audio;
  }

  private async markVoiceFailure(
    log: ActionLog,
    summary: string,
    details: Record<string, unknown>
  ) {
    await this.actionLogsService.updateActionLog(log.id, {
      summary,
      status: "failed",
      errorMessage: summary,
      outputPreview: details,
      metadata: {
        ...log.metadata,
        realExternalAction: false
      }
    });
  }

  private async completeBrowserSpeech(
    log: ActionLog,
    voice: string,
    fallbackDetails: Record<string, unknown> = {}
  ): Promise<VoiceSpeechResult> {
    await this.actionLogsService.updateActionLog(log.id, {
      status: "completed",
      outputPreview: {
        clientSide: true,
        mimeType: "browser/speech-synthesis",
        ...fallbackDetails
      },
      metadata: {
        ...log.metadata,
        provider: "browser",
        model: browserTtsModel,
        voice,
        fallback: Object.keys(fallbackDetails).length > 0,
        realExternalAction: false
      }
    });

    return {
      audioBase64: null,
      mimeType: "browser/speech-synthesis",
      provider: "browser",
      model: browserTtsModel,
      voice,
      clientSide: true
    };
  }

  private isSttConfigured(provider: SttProvider) {
    return Boolean(this.getProviderApiKey(provider));
  }

  private isTtsConfigured(provider: TtsProvider) {
    return provider === "browser" || Boolean(this.getProviderApiKey(provider));
  }

  private getProviderApiKey(provider: SttProvider) {
    return this.config.get<string>(audioProviderConfig[provider].apiKeyEnv)?.trim() ?? "";
  }

  private getSttProvider(): SttProvider {
    const configured = normalizeSttProvider(
      this.config.get<string>("VOICE_STT_PROVIDER")
    );

    if (configured) {
      return configured;
    }

    if (this.getProviderApiKey("groq")) {
      return "groq";
    }

    if (this.getProviderApiKey("openai")) {
      return "openai";
    }

    return "groq";
  }

  private getTtsProvider(): TtsProvider {
    const configured = normalizeTtsProvider(
      this.config.get<string>("VOICE_TTS_PROVIDER")
    );

    if (configured) {
      return configured;
    }

    if (this.getProviderApiKey("groq")) {
      return "groq";
    }

    if (this.getProviderApiKey("openai")) {
      return "openai";
    }

    return "browser";
  }

  private getSttModel(provider: SttProvider) {
    const generic = this.config.get<string>("VOICE_STT_MODEL")?.trim();

    if (generic) {
      return generic;
    }

    if (provider === "groq") {
      return (
        this.config.get<string>("GROQ_STT_MODEL")?.trim() ||
        defaultGroqSttModel
      );
    }

    return (
      this.config.get<string>("OPENAI_STT_MODEL")?.trim() ||
      this.config.get<string>("OPENAI_TRANSCRIBE_MODEL")?.trim() ||
      defaultOpenAiSttModel
    );
  }

  private getTtsModel(provider: TtsProvider) {
    const generic = this.config.get<string>("VOICE_TTS_MODEL")?.trim();

    if (generic && provider !== "browser") {
      return generic;
    }

    if (provider === "groq") {
      return (
        this.config.get<string>("GROQ_TTS_MODEL")?.trim() ||
        defaultGroqTtsModel
      );
    }

    if (provider === "openai") {
      return this.config.get<string>("OPENAI_TTS_MODEL")?.trim() || defaultOpenAiTtsModel;
    }

    return browserTtsModel;
  }

  private getTtsVoice(provider: TtsProvider) {
    const generic = this.config.get<string>("VOICE_TTS_VOICE")?.trim();

    if (generic && provider !== "browser") {
      return generic;
    }

    if (provider === "groq") {
      return this.config.get<string>("GROQ_TTS_VOICE")?.trim() || defaultGroqVoice;
    }

    if (provider === "openai") {
      return this.config.get<string>("OPENAI_TTS_VOICE")?.trim() || defaultOpenAiVoice;
    }

    return browserTtsVoice;
  }

  private getTtsResponseFormat(provider: TtsProvider) {
    const configured = normalizeTtsResponseFormat(
      this.config.get<string>("VOICE_TTS_RESPONSE_FORMAT")
    );

    if (provider === "browser") {
      return "browser";
    }

    if (configured) {
      return configured;
    }

    return provider === "groq" ? "wav" : "mp3";
  }

  private getBrowserTtsFallback(provider: TtsProvider) {
    if (provider === "browser") {
      return null;
    }

    const value = this.config.get<string>("VOICE_TTS_FALLBACK")?.trim().toLowerCase();

    return value === "none" || value === "off" || value === "false"
      ? null
      : "browser";
  }

  private getMaxAudioBytes() {
    const configured = Number(this.config.get<string>("VOICE_MAX_AUDIO_BYTES"));

    if (Number.isFinite(configured) && configured > 0) {
      return Math.min(25 * 1024 * 1024, Math.trunc(configured));
    }

    return defaultMaxAudioBytes;
  }

  private providerNotConfigured(
    capability: "stt" | "tts",
    provider: SttProvider | TtsProvider
  ) {
    return new ServiceUnavailableException({
      code: "VOICE_PROVIDER_NOT_CONFIGURED",
      message:
        "Voice provider is not configured. Configure GROQ_API_KEY or OPENAI_API_KEY for push-to-talk voice.",
      details: { provider, capability }
    });
  }

  private providerUnavailable(
    capability: "stt" | "tts",
    provider: SttProvider | TtsProvider
  ) {
    return new ServiceUnavailableException({
      code: "VOICE_PROVIDER_UNAVAILABLE",
      message:
        "Voice provider is unavailable. Please check the voice provider setup and try again.",
      details: { provider, capability }
    });
  }
}

function safeFileName(fileName: string | undefined, mimeType: string) {
  const extension = extensionForMimeType(mimeType);
  const normalized = fileName
    ?.replaceAll(/[^\w.-]+/g, "-")
    .replaceAll(/^-+|-+$/g, "")
    .slice(0, 80);

  if (normalized) {
    return normalized.includes(".") ? normalized : `${normalized}.${extension}`;
  }

  return `nami-voice.${extension}`;
}

function extensionForMimeType(mimeType: string) {
  switch (mimeType) {
    case "audio/mpeg":
    case "audio/mp3":
      return "mp3";
    case "audio/flac":
      return "flac";
    case "audio/mp4":
    case "video/mp4":
      return "mp4";
    case "audio/mpga":
      return "mpga";
    case "audio/m4a":
      return "m4a";
    case "audio/ogg":
      return "ogg";
    case "audio/wav":
      return "wav";
    case "audio/webm":
    case "video/webm":
      return "webm";
    default:
      return "webm";
  }
}

function normalizeSttProvider(value: string | undefined): SttProvider | null {
  const normalized = value?.trim().toLowerCase();

  return normalized === "openai" || normalized === "groq" ? normalized : null;
}

function normalizeTtsProvider(value: string | undefined): TtsProvider | null {
  const normalized = value?.trim().toLowerCase();

  return normalized === "openai" || normalized === "groq" || normalized === "browser"
    ? normalized
    : null;
}

function normalizeTtsResponseFormat(value: string | undefined) {
  const normalized = value?.trim().toLowerCase();

  return normalized === "mp3" || normalized === "wav" ? normalized : null;
}

function mimeTypeForResponseFormat(responseFormat: "mp3" | "wav") {
  return responseFormat === "wav" ? "audio/wav" : "audio/mpeg";
}
