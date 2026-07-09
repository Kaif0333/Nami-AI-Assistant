export const sttProviders = ["openai", "groq"] as const;
export const ttsProviders = ["openai", "groq", "browser"] as const;
export const voiceProviders = ["openai", "groq", "browser"] as const;

export type VoiceProvider = (typeof voiceProviders)[number];
export type SttProvider = (typeof sttProviders)[number];
export type TtsProvider = (typeof ttsProviders)[number];

export type VoiceStatus = {
  mode: "push_to_talk";
  stt: {
    provider: SttProvider;
    configured: boolean;
    model: string;
    maxAudioBytes: number;
    supportedMimeTypes: string[];
  };
  tts: {
    provider: TtsProvider;
    configured: boolean;
    model: string;
    voice: string;
    responseFormat: "mp3" | "wav" | "browser";
    fallbackProvider: "browser" | null;
    clientSide: boolean;
  };
  realtime: {
    configured: boolean;
    model: string;
    status: "planned_later";
  };
  safety: {
    pushToTalkOnly: true;
    wakeWordEnabled: false;
    backgroundRecordingEnabled: false;
    uploadsRequireUserGesture: true;
  };
};

export type VoiceTranscriptionResult = {
  transcript: string;
  provider: SttProvider;
  model: string;
  durationMs?: number;
};

export type VoiceSpeechResult = {
  audioBase64: string | null;
  mimeType: "audio/mpeg" | "audio/wav" | "browser/speech-synthesis";
  provider: TtsProvider;
  model: string;
  voice: string;
  clientSide: boolean;
};
