"use client";

import {
  FormEvent,
  PointerEvent,
  useCallback,
  useEffect,
  useRef,
  useState
} from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Mic,
  MicOff,
  RadioTower,
  SendHorizontal,
  Volume2
} from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getVoiceStatus,
  sendChatMessage,
  synthesizeVoice,
  transcribeVoice
} from "@/lib/nami-api";
import type { VoiceStatus } from "@/lib/nami-api";
import { cn } from "@/lib/utils";
import {
  formatTextForSpeech,
  selectPreferredFemaleVoice
} from "@/lib/voice-text";

type VoiceState =
  | "idle"
  | "requesting_mic"
  | "listening"
  | "transcribing"
  | "thinking"
  | "speaking"
  | "error";

type TimelineEvent = {
  id: string;
  label: string;
  detail: string;
  status: "ok" | "pending" | "error";
};

function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function arrayBufferToBase64(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = "";

  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
}

function getCurrentTimestampMs() {
  return Date.now();
}

function getRecorderMimeType(supportedMimeTypes: string[]) {
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/mpeg"
  ];

  return candidates.find(
    (candidate) =>
      MediaRecorder.isTypeSupported(candidate) &&
      supportedMimeTypes.includes(candidate.split(";")[0])
  );
}

function getBrowserVoices() {
  const voices = window.speechSynthesis.getVoices();

  if (!voices.length) {
    return new Promise<SpeechSynthesisVoice[]>((resolve) => {
      const timeout = window.setTimeout(() => {
        window.speechSynthesis.removeEventListener("voiceschanged", handleVoices);
        resolve(window.speechSynthesis.getVoices());
      }, 800);

      function handleVoices() {
        window.clearTimeout(timeout);
        window.speechSynthesis.removeEventListener("voiceschanged", handleVoices);
        resolve(window.speechSynthesis.getVoices());
      }

      window.speechSynthesis.addEventListener("voiceschanged", handleVoices, {
        once: true
      });
    });
  }

  return Promise.resolve(voices);
}

async function speakWithBrowser(
  text: string,
  voiceName: string,
  signal: AbortSignal
) {
  if (!("speechSynthesis" in window) || !("SpeechSynthesisUtterance" in window)) {
    return Promise.reject(
      new Error("Browser speech synthesis is not available in this runtime.")
    );
  }

  const voices = await getBrowserVoices();

  return new Promise<void>((resolve, reject) => {
    if (signal.aborted) {
      resolve();
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    const selectedVoice = selectPreferredFemaleVoice(voiceName, voices);
    let settled = false;

    function settle(error?: Error) {
      if (settled) {
        return;
      }

      settled = true;
      signal.removeEventListener("abort", handleAbort);

      if (error) {
        reject(error);
        return;
      }

      resolve();
    }

    function handleAbort() {
      window.speechSynthesis.cancel();
      settle();
    }

    if (selectedVoice) {
      utterance.voice = selectedVoice;
    } else {
      settle(
        new Error(
          "No female browser voice is available. Install or enable a female English voice for browser TTS fallback."
        )
      );
      return;
    }

    utterance.pitch = 1.12;
    utterance.rate = 1.02;
    utterance.onend = () => settle();
    utterance.onerror = () =>
      settle(new Error("Browser speech synthesis failed."));

    signal.addEventListener("abort", handleAbort, { once: true });
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  });
}

async function playAudioToEnd(audio: HTMLAudioElement, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal.aborted) {
      resolve();
      return;
    }

    let settled = false;

    const settle = (error?: Error) => {
      if (settled) {
        return;
      }

      settled = true;
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("error", handleError);
      signal.removeEventListener("abort", handleAbort);

      if (error) {
        reject(error);
        return;
      }

      resolve();
    };

    const handleEnded = () => settle();
    const handleError = () =>
      settle(new Error("Generated speech audio failed to play."));
    const handleAbort = () => {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
      settle();
    };

    audio.addEventListener("ended", handleEnded, { once: true });
    audio.addEventListener("error", handleError, { once: true });
    signal.addEventListener("abort", handleAbort, { once: true });

    audio.play().catch((error: unknown) => {
      settle(error instanceof Error ? error : new Error("Audio playback failed."));
    });
  });
}

export default function VoicePage() {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordingStartedAtRef = useRef<number>(0);
  const playbackAbortRef = useRef<AbortController | null>(null);
  const playbackTokenRef = useRef(0);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const [voiceStatus, setVoiceStatus] = useState<VoiceStatus | null>(null);
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);
  const [transcript, setTranscript] = useState("");
  const [fallbackDraft, setFallbackDraft] = useState("");
  const [fallbackReply, setFallbackReply] = useState("");
  const [speakDraft, setSpeakDraft] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [browserTtsAvailable] = useState(
    () =>
      typeof window !== "undefined" &&
      "speechSynthesis" in window &&
      "SpeechSynthesisUtterance" in window
  );
  const [timeline, setTimeline] = useState<TimelineEvent[]>([
    {
      id: "voice-page-ready",
      label: "Voice console ready",
      detail: "Push-to-talk only",
      status: "ok"
    }
  ]);

  const refreshStatus = useCallback(async () => {
    try {
      setIsLoadingStatus(true);
      setVoiceStatus(await getVoiceStatus());
      setErrorMessage("");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Voice status request failed.";

      setErrorMessage(message);
      setTimeline((current) => [
        {
          id: createId(),
          label: "Voice status failed",
          detail: message,
          status: "error"
        },
        ...current
      ]);
    } finally {
      setIsLoadingStatus(false);
    }
  }, []);

  const stopMediaTracks = useCallback(() => {
    for (const track of mediaStreamRef.current?.getTracks() ?? []) {
      track.stop();
    }

    mediaStreamRef.current = null;
  }, []);

  const stopSpeechSources = useCallback(() => {
    playbackAbortRef.current?.abort();
    playbackAbortRef.current = null;

    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.removeAttribute("src");
      currentAudioRef.current.load();
      currentAudioRef.current = null;
    }

    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  }, []);

  const stopSpeechPlayback = useCallback(() => {
    playbackTokenRef.current += 1;
    stopSpeechSources();
  }, [stopSpeechSources]);

  const beginSpeechPlayback = useCallback(() => {
    playbackTokenRef.current += 1;
    stopSpeechSources();

    const controller = new AbortController();

    playbackAbortRef.current = controller;

    return {
      signal: controller.signal,
      token: playbackTokenRef.current
    };
  }, [stopSpeechSources]);

  function isCurrentPlayback(token: number) {
    return playbackTokenRef.current === token;
  }

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void refreshStatus();
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [refreshStatus]);

  useEffect(() => {
    return () => {
      stopMediaTracks();
      stopSpeechPlayback();
    };
  }, [stopMediaTracks, stopSpeechPlayback]);

  function pushTimeline(event: Omit<TimelineEvent, "id">) {
    setTimeline((current) => [{ id: createId(), ...event }, ...current]);
  }

  async function startRecording() {
    stopSpeechPlayback();

    if (!voiceStatus?.stt.configured) {
      const message =
        "Voice STT provider is not configured. Configure GROQ_API_KEY or OPENAI_API_KEY to use push-to-talk voice.";

      setVoiceState("error");
      setErrorMessage(message);
      pushTimeline({
        label: "Voice setup required",
        detail: message,
        status: "error"
      });
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      const message = "Microphone recording is not available in this runtime.";

      setVoiceState("error");
      setErrorMessage(message);
      pushTimeline({
        label: "Microphone unavailable",
        detail: message,
        status: "error"
      });
      return;
    }

    try {
      setVoiceState("requesting_mic");
      setErrorMessage("");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = getRecorderMimeType(voiceStatus.stt.supportedMimeTypes);

      if (!mimeType) {
        stopMediaTracks();
        throw new Error("No supported browser recording format is available.");
      }

      chunksRef.current = [];
      mediaStreamRef.current = stream;
      recordingStartedAtRef.current = getCurrentTimestampMs();

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };
      recorder.onstop = () => {
        void submitRecording(mimeType.split(";")[0]);
      };
      recorder.start();
      setVoiceState("listening");
      pushTimeline({
        label: "Listening",
        detail: "Microphone active by user gesture",
        status: "pending"
      });
    } catch (error) {
      stopMediaTracks();
      const message =
        error instanceof Error ? error.message : "Microphone permission failed.";

      setVoiceState("error");
      setErrorMessage(message);
      pushTimeline({
        label: "Microphone permission failed",
        detail: message,
        status: "error"
      });
    }
  }

  function stopRecording() {
    const recorder = mediaRecorderRef.current;

    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    }
  }

  async function submitRecording(mimeType: string) {
    const durationMs = Math.max(
      0,
      getCurrentTimestampMs() - recordingStartedAtRef.current
    );
    const audio = new Blob(chunksRef.current, { type: mimeType });

    stopMediaTracks();
    mediaRecorderRef.current = null;
    chunksRef.current = [];

    if (!audio.size) {
      setVoiceState("error");
      setErrorMessage("No audio was captured.");
      return;
    }

    if (voiceStatus && audio.size > voiceStatus.stt.maxAudioBytes) {
      setVoiceState("error");
      setErrorMessage("Voice clip is too large for Phase 5 push-to-talk.");
      return;
    }

    try {
      setVoiceState("transcribing");
      pushTimeline({
        label: "Transcribing",
        detail: `${formatBytes(audio.size)} captured`,
        status: "pending"
      });

      const result = await transcribeVoice({
        audioBase64: arrayBufferToBase64(await audio.arrayBuffer()),
        mimeType,
        fileName: "nami-voice.webm",
        durationMs
      });

      setTranscript(result.transcript);
      setFallbackDraft(result.transcript);
      pushTimeline({
        label: "Transcript ready",
        detail: `${result.provider}/${result.model}`,
        status: "ok"
      });
      await submitMessageToNami(result.transcript, "Voice message");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Voice transcription failed.";

      setVoiceState("error");
      setErrorMessage(message);
      pushTimeline({
        label: "Transcription failed",
        detail: message,
        status: "error"
      });
    }
  }

  async function handleFallbackSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const message = fallbackDraft.trim();

    if (!message) {
      return;
    }

    await submitMessageToNami(message, "Text fallback");
  }

  async function submitMessageToNami(message: string, sourceLabel: string) {
    try {
      setVoiceState("thinking");
      setFallbackReply("");
      pushTimeline({
        label: `${sourceLabel} sent`,
        detail: `${message.length} characters`,
        status: "pending"
      });
      const response = await sendChatMessage({ message });

      setFallbackReply(response.reply);
      pushTimeline({
        label: "Nami answered",
        detail: response.modelRoute
          ? `${response.modelRoute.taskProfile} via ${response.modelRoute.provider}/${response.modelRoute.model}`
          : "No model route returned",
        status: "ok"
      });
      await playSpeech(response.reply);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Nami response failed.";

      setVoiceState("error");
      setErrorMessage(message);
      pushTimeline({
        label: "Nami response failed",
        detail: message,
        status: "error"
      });
    }
  }

  async function handleSpeakSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = speakDraft.trim() || fallbackReply.trim() || transcript.trim();

    if (!text) {
      return;
    }

    await playSpeech(text);
  }

  async function playSpeech(text: string) {
    const spokenText = formatTextForSpeech(text);

    if (!spokenText) {
      return;
    }

    const { signal, token } = beginSpeechPlayback();

    try {
      setVoiceState("speaking");
      pushTimeline({
        label: "Speech requested",
        detail: `${spokenText.length} spoken characters`,
        status: "pending"
      });
      const speech = await synthesizeVoice({ text: spokenText });

      if (signal.aborted || !isCurrentPlayback(token)) {
        return;
      }

      if (speech.clientSide) {
        await speakWithBrowser(spokenText, speech.voice, signal);
      } else if (speech.audioBase64) {
        const audio = new Audio(`data:${speech.mimeType};base64,${speech.audioBase64}`);

        currentAudioRef.current = audio;
        await playAudioToEnd(audio, signal);
      } else {
        throw new Error("Voice speech response did not include playable audio.");
      }

      if (signal.aborted || !isCurrentPlayback(token)) {
        return;
      }

      currentAudioRef.current = null;
      playbackAbortRef.current = null;
      setVoiceState("idle");
      pushTimeline({
        label: "Speech completed",
        detail: `${speech.provider}/${speech.model}`,
        status: "ok"
      });
    } catch (error) {
      if (signal.aborted || !isCurrentPlayback(token)) {
        return;
      }

      const message =
        error instanceof Error ? error.message : "Voice speech failed.";

      currentAudioRef.current = null;
      playbackAbortRef.current = null;
      setVoiceState("error");
      setErrorMessage(message);
      pushTimeline({
        label: "Speech failed",
        detail: message,
        status: "error"
      });
    }
  }

  function handlePointerDown(event: PointerEvent<HTMLButtonElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    void startRecording();
  }

  function handlePointerUp(event: PointerEvent<HTMLButtonElement>) {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    stopRecording();
  }

  const isBusy =
    voiceState === "requesting_mic" ||
    voiceState === "transcribing" ||
    voiceState === "thinking" ||
    voiceState === "speaking";
  const isListening = voiceState === "listening";
  const ttsReady =
    Boolean(
      voiceStatus?.tts.provider === "browser"
        ? browserTtsAvailable
        : voiceStatus?.tts.configured
    ) ||
    Boolean(voiceStatus?.tts.fallbackProvider === "browser" && browserTtsAvailable);

  return (
    <AppShell
      title="Voice"
      description="Phase 5 push-to-talk voice console with text fallback."
    >
      <div className="grid gap-4 xl:grid-cols-[1fr_22rem]">
        <div className="grid gap-4 lg:grid-cols-[22rem_1fr]">
          <Card>
            <CardHeader className="flex-row items-center justify-between gap-3">
              <CardTitle>Push-to-talk</CardTitle>
              <Badge variant={voiceStatus?.stt.configured ? "default" : "secondary"}>
                {voiceStatus?.stt.configured ? "STT ready" : "Setup needed"}
              </Badge>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <button
                aria-label={isListening ? "Release to stop" : "Hold to talk"}
                className={cn(
                  "flex aspect-square w-full items-center justify-center rounded-lg border border-border bg-secondary text-primary transition-colors",
                  isListening && "bg-primary text-primary-foreground",
                  isBusy && "opacity-70"
                )}
                disabled={isBusy}
                onPointerCancel={handlePointerUp}
                onPointerDown={handlePointerDown}
                onPointerLeave={(event) => {
                  if (isListening) {
                    handlePointerUp(event);
                  }
                }}
                onPointerUp={handlePointerUp}
                type="button"
              >
                {isBusy ? (
                  <Loader2 aria-hidden className="size-12 animate-spin" />
                ) : isListening ? (
                  <MicOff aria-hidden className="size-12" />
                ) : (
                  <Mic aria-hidden className="size-12" />
                )}
              </button>
              <div className="grid gap-2 rounded-lg border border-border bg-background p-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">State</span>
                  <span className="font-medium text-foreground">
                    {voiceState.replaceAll("_", " ")}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Mode</span>
                  <span className="font-medium text-foreground">
                    {voiceStatus?.mode.replaceAll("_", "-") ?? "loading"}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">STT</span>
                  <span className="font-medium text-foreground">
                    {voiceStatus
                      ? `${voiceStatus.stt.provider}/${voiceStatus.stt.model}`
                      : "loading"}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Max clip</span>
                  <span className="font-medium text-foreground">
                    {voiceStatus ? formatBytes(voiceStatus.stt.maxAudioBytes) : "..."}
                  </span>
                </div>
              </div>
              {errorMessage ? (
                <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                  {errorMessage}
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Text fallback</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {transcript ? (
                <div className="rounded-lg border border-border bg-secondary/50 p-3">
                  <div className="text-xs font-medium text-muted-foreground">
                    Transcript
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-foreground">
                    {transcript}
                  </p>
                </div>
              ) : null}
              <form className="flex flex-col gap-3" onSubmit={handleFallbackSubmit}>
                <textarea
                  aria-label="Text fallback message"
                  className="min-h-32 w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onChange={(event) => setFallbackDraft(event.target.value)}
                  placeholder="Type or use a transcript..."
                  value={fallbackDraft}
                />
                <div className="flex justify-end">
                  <Button disabled={!fallbackDraft.trim()} type="submit">
                    <SendHorizontal aria-hidden className="size-4" />
                    Send fallback
                  </Button>
                </div>
              </form>
              {fallbackReply ? (
                <div className="rounded-lg border border-border bg-muted/30 p-3">
                  <div className="text-xs font-medium text-muted-foreground">
                    Nami
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-foreground">
                    {fallbackReply}
                  </p>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader className="flex-row items-center justify-between gap-3">
              <CardTitle>Speech output</CardTitle>
              <Badge variant={ttsReady ? "default" : "secondary"}>
                {ttsReady ? "TTS ready" : "Setup needed"}
              </Badge>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="grid gap-2 rounded-lg border border-border bg-background p-3 text-sm md:grid-cols-3">
                <div>
                  <div className="text-xs font-medium text-muted-foreground">
                    Provider
                  </div>
                  <div className="mt-1 font-medium text-foreground">
                    {voiceStatus?.tts.provider ?? "loading"}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-medium text-muted-foreground">
                    Model
                  </div>
                  <div className="mt-1 break-words font-medium text-foreground">
                    {voiceStatus?.tts.model ?? "loading"}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-medium text-muted-foreground">
                    Fallback
                  </div>
                  <div className="mt-1 font-medium text-foreground">
                    {voiceStatus?.tts.fallbackProvider ?? "none"}
                  </div>
                </div>
              </div>
              <form className="grid gap-3 md:grid-cols-[1fr_auto]" onSubmit={handleSpeakSubmit}>
                <input
                  aria-label="Text to speak"
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onChange={(event) => setSpeakDraft(event.target.value)}
                  placeholder="Text to speak..."
                  value={speakDraft}
                />
                <Button disabled={voiceState === "speaking" || !ttsReady} type="submit">
                  {voiceState === "speaking" ? (
                    <Loader2 aria-hidden className="size-4 animate-spin" />
                  ) : (
                    <Volume2 aria-hidden className="size-4" />
                  )}
                  Speak
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Voice Timeline</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {isLoadingStatus ? (
              <div className="flex gap-3 rounded-lg border border-border bg-background p-3">
                <Loader2 aria-hidden className="mt-0.5 size-4 animate-spin" />
                <div>
                  <div className="text-sm font-medium text-foreground">
                    Loading status
                  </div>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    Checking voice provider setup.
                  </p>
                </div>
              </div>
            ) : null}
            {timeline.map((item) => {
              const Icon =
                item.status === "error"
                  ? AlertTriangle
                  : item.status === "pending"
                    ? RadioTower
                    : CheckCircle2;

              return (
                <div
                  className="flex gap-3 rounded-lg border border-border bg-background p-3"
                  key={item.id}
                >
                  <div
                    className={cn(
                      "mt-0.5 text-primary",
                      item.status === "error" && "text-destructive",
                      item.status === "pending" && "text-foreground"
                    )}
                  >
                    <Icon
                      aria-hidden
                      className={cn(
                        "size-4",
                        item.status === "pending" && "animate-pulse"
                      )}
                    />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-foreground">
                      {item.label}
                    </div>
                    <p className="mt-1 break-words text-xs leading-5 text-muted-foreground">
                      {item.detail}
                    </p>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
