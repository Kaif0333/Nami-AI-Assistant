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

type VoiceState =
  | "idle"
  | "requesting_mic"
  | "listening"
  | "transcribing"
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

export default function VoicePage() {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordingStartedAtRef = useRef<number>(0);
  const [voiceStatus, setVoiceStatus] = useState<VoiceStatus | null>(null);
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);
  const [transcript, setTranscript] = useState("");
  const [fallbackDraft, setFallbackDraft] = useState("");
  const [fallbackReply, setFallbackReply] = useState("");
  const [speakDraft, setSpeakDraft] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
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

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void refreshStatus();
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [refreshStatus]);

  useEffect(() => {
    return () => {
      stopMediaTracks();
    };
  }, []);

  function stopMediaTracks() {
    for (const track of mediaStreamRef.current?.getTracks() ?? []) {
      track.stop();
    }

    mediaStreamRef.current = null;
  }

  function pushTimeline(event: Omit<TimelineEvent, "id">) {
    setTimeline((current) => [{ id: createId(), ...event }, ...current]);
  }

  async function startRecording() {
    if (!voiceStatus?.stt.configured) {
      const message =
        "Voice provider is not configured. Configure OPENAI_API_KEY and voice models to use push-to-talk voice.";

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
      recordingStartedAtRef.current = Date.now();

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
    const durationMs = Math.max(0, Date.now() - recordingStartedAtRef.current);
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
      setVoiceState("idle");
      pushTimeline({
        label: "Transcript ready",
        detail: `${result.provider}/${result.model}`,
        status: "ok"
      });
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

    try {
      setFallbackReply("");
      pushTimeline({
        label: "Text fallback sent",
        detail: `${message.length} characters`,
        status: "pending"
      });
      const response = await sendChatMessage({ message });

      setFallbackReply(response.reply);
      pushTimeline({
        label: "Text fallback answered",
        detail: response.modelRoute
          ? `${response.modelRoute.taskProfile} via ${response.modelRoute.provider}/${response.modelRoute.model}`
          : "No model route returned",
        status: "ok"
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Text fallback failed.";

      pushTimeline({
        label: "Text fallback failed",
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

    try {
      setVoiceState("speaking");
      pushTimeline({
        label: "Speech requested",
        detail: `${text.length} characters`,
        status: "pending"
      });
      const speech = await synthesizeVoice({ text });
      const audio = new Audio(`data:${speech.mimeType};base64,${speech.audioBase64}`);

      await audio.play();
      setVoiceState("idle");
      pushTimeline({
        label: "Speech playing",
        detail: `${speech.provider}/${speech.model}`,
        status: "ok"
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Voice speech failed.";

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
    voiceState === "speaking";
  const isListening = voiceState === "listening";

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
              <Badge variant={voiceStatus?.tts.configured ? "default" : "secondary"}>
                {voiceStatus?.tts.configured ? "TTS ready" : "Setup needed"}
              </Badge>
            </CardHeader>
            <CardContent>
              <form className="grid gap-3 md:grid-cols-[1fr_auto]" onSubmit={handleSpeakSubmit}>
                <input
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onChange={(event) => setSpeakDraft(event.target.value)}
                  placeholder="Text to speak..."
                  value={speakDraft}
                />
                <Button disabled={voiceState === "speaking"} type="submit">
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
