export const voiceProviders = ["openai"] as const;

export type VoiceProvider = (typeof voiceProviders)[number];

export type VoiceStatus = {
  mode: "push_to_talk";
  stt: {
    provider: VoiceProvider;
    configured: boolean;
    model: string;
    maxAudioBytes: number;
    supportedMimeTypes: string[];
  };
  tts: {
    provider: VoiceProvider;
    configured: boolean;
    model: string;
    voice: string;
    responseFormat: "mp3";
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
  provider: VoiceProvider;
  model: string;
  durationMs?: number;
};

export type VoiceSpeechResult = {
  audioBase64: string;
  mimeType: "audio/mpeg";
  provider: VoiceProvider;
  model: string;
  voice: string;
};
