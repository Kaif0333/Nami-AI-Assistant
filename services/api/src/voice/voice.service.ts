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
  VoiceTranscriptionResult
} from "./voice.types";

type OpenAiTranscriptionResponse = {
  text?: string;
};

const openAiAudioBaseUrl = "https://api.openai.com/v1/audio";
const supportedSttMimeTypes = [
  "audio/mpeg",
  "audio/mp3",
  "audio/mp4",
  "audio/mpga",
  "audio/m4a",
  "audio/wav",
  "audio/webm",
  "video/mp4",
  "video/webm"
];
const defaultMaxAudioBytes = 8 * 1024 * 1024;
const defaultSttModel = "gpt-4o-mini-transcribe";
const defaultTtsModel = "gpt-4o-mini-tts";
const defaultVoice = "alloy";

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
    return {
      mode: "push_to_talk",
      stt: {
        provider: "openai",
        configured: this.isOpenAiConfigured(),
        model: this.getSttModel(),
        maxAudioBytes: this.getMaxAudioBytes(),
        supportedMimeTypes: supportedSttMimeTypes
      },
      tts: {
        provider: "openai",
        configured: this.isOpenAiConfigured(),
        model: this.getTtsModel(),
        voice: this.getTtsVoice(),
        responseFormat: "mp3"
      },
      realtime: {
        configured: false,
        model: this.config.get<string>("OPENAI_REALTIME_MODEL")?.trim() || "",
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
        provider: "openai",
        pushToTalkOnly: true,
        realExternalAction: false
      }
    });

    if (!this.isOpenAiConfigured()) {
      await this.markVoiceFailure(log, "Voice STT not configured", {
        mimeType: input.mimeType,
        bytes: audio.byteLength
      });
      throw this.providerNotConfigured("stt");
    }

    const model = this.getSttModel();
    const formData = new FormData();
    const fileName = safeFileName(input.fileName, input.mimeType);

    formData.set("model", model);
    formData.set("file", new Blob([audio], { type: input.mimeType }), fileName);

    try {
      const response = await fetch(`${openAiAudioBaseUrl}/transcriptions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.getOpenAiApiKey()}`
        },
        body: formData
      });

      if (!response.ok) {
        this.logger.warn(`voice.stt_unavailable status=${response.status}`);
        await this.markVoiceFailure(log, "Voice STT provider request failed", {
          status: response.status,
          model
        });
        throw this.providerUnavailable("stt");
      }

      const payload = (await response.json()) as OpenAiTranscriptionResponse;
      const transcript = payload.text?.trim();

      if (!transcript) {
        await this.markVoiceFailure(
          log,
          "Voice STT provider returned no transcript",
          { model }
        );
        throw this.providerUnavailable("stt");
      }

      await this.actionLogsService.updateActionLog(log.id, {
        status: "completed",
        outputPreview: {
          transcriptPreview: transcript.slice(0, 160),
          transcriptCharacters: transcript.length
        },
        metadata: {
          ...log.metadata,
          provider: "openai",
          model,
          pushToTalkOnly: true,
          realExternalAction: false
        }
      });

      return {
        transcript,
        provider: "openai",
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
      await this.markVoiceFailure(log, "Voice STT failed", { model });
      throw this.providerUnavailable("stt");
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
        voice: input.voice ?? this.getTtsVoice()
      },
      metadata: {
        source: "voice",
        provider: "openai",
        realExternalAction: false
      }
    });

    if (!this.isOpenAiConfigured()) {
      await this.markVoiceFailure(log, "Voice TTS not configured", {
        characters: text.length
      });
      throw this.providerNotConfigured("tts");
    }

    const model = this.getTtsModel();
    const voice = input.voice?.trim() || this.getTtsVoice();

    try {
      const response = await fetch(`${openAiAudioBaseUrl}/speech`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.getOpenAiApiKey()}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model,
          voice,
          input: text,
          response_format: "mp3"
        })
      });

      if (!response.ok) {
        this.logger.warn(`voice.tts_unavailable status=${response.status}`);
        await this.markVoiceFailure(log, "Voice TTS provider request failed", {
          status: response.status,
          model,
          voice
        });
        throw this.providerUnavailable("tts");
      }

      const audioBuffer = Buffer.from(await response.arrayBuffer());
      const audioBase64 = audioBuffer.toString("base64");

      await this.actionLogsService.updateActionLog(log.id, {
        status: "completed",
        outputPreview: {
          bytes: audioBuffer.byteLength,
          mimeType: "audio/mpeg"
        },
        metadata: {
          ...log.metadata,
          provider: "openai",
          model,
          voice,
          realExternalAction: false
        }
      });

      return {
        audioBase64,
        mimeType: "audio/mpeg",
        provider: "openai",
        model,
        voice
      };
    } catch (error) {
      if (error instanceof ServiceUnavailableException) {
        throw error;
      }

      this.logger.warn(
        `voice.tts_request_failed message=${error instanceof Error ? error.message : "unknown"}`
      );
      await this.markVoiceFailure(log, "Voice TTS failed", {
        model,
        voice
      });
      throw this.providerUnavailable("tts");
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
        provider: "openai",
        realExternalAction: false
      }
    });
  }

  private isOpenAiConfigured() {
    return Boolean(this.getOpenAiApiKey());
  }

  private getOpenAiApiKey() {
    return this.config.get<string>("OPENAI_API_KEY")?.trim() ?? "";
  }

  private getSttModel() {
    return (
      this.config.get<string>("OPENAI_STT_MODEL")?.trim() ||
      this.config.get<string>("OPENAI_TRANSCRIBE_MODEL")?.trim() ||
      defaultSttModel
    );
  }

  private getTtsModel() {
    return this.config.get<string>("OPENAI_TTS_MODEL")?.trim() || defaultTtsModel;
  }

  private getTtsVoice() {
    return this.config.get<string>("OPENAI_TTS_VOICE")?.trim() || defaultVoice;
  }

  private getMaxAudioBytes() {
    const configured = Number(this.config.get<string>("VOICE_MAX_AUDIO_BYTES"));

    if (Number.isFinite(configured) && configured > 0) {
      return Math.min(25 * 1024 * 1024, Math.trunc(configured));
    }

    return defaultMaxAudioBytes;
  }

  private providerNotConfigured(capability: "stt" | "tts") {
    return new ServiceUnavailableException({
      code: "VOICE_PROVIDER_NOT_CONFIGURED",
      message:
        "Voice provider is not configured. Configure OPENAI_API_KEY and voice models to use push-to-talk voice.",
      details: { provider: "openai", capability }
    });
  }

  private providerUnavailable(capability: "stt" | "tts") {
    return new ServiceUnavailableException({
      code: "VOICE_PROVIDER_UNAVAILABLE",
      message:
        "Voice provider is unavailable. Please check the voice provider setup and try again.",
      details: { provider: "openai", capability }
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
    case "audio/mp4":
    case "video/mp4":
      return "mp4";
    case "audio/mpga":
      return "mpga";
    case "audio/m4a":
      return "m4a";
    case "audio/wav":
      return "wav";
    case "audio/webm":
    case "video/webm":
      return "webm";
    default:
      return "webm";
  }
}
