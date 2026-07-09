"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  Loader2,
  Paperclip,
  SendHorizontal,
  X,
  UserRound
} from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getApiBaseUrl, sendChatMessage } from "@/lib/nami-api";
import { cn } from "@/lib/utils";

type ChatMessage = {
  id: string;
  role: "Nami" | "Kaif";
  text: string;
  tone?: "normal" | "error";
  wasTruncated?: boolean;
};

type TimelineEvent = {
  id: string;
  label: string;
  detail: string;
  status: "ok" | "pending" | "error";
};

type PendingAttachment = {
  id: string;
  name: string;
  size: number;
  type: string;
};

const initialMessages: ChatMessage[] = [
  {
    id: "welcome",
    role: "Nami",
    text: "Phase 2 chat is connected through the local Nami API. I can answer safely, but advanced tools stay locked until their later phases."
  }
];

function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function formatFileSize(size: number) {
  if (size < 1024) {
    return `${size} B`;
  }

  if (size < 1024 * 1024) {
    return `${Math.round(size / 1024)} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ChatPage() {
  const apiUrl = useMemo(() => getApiBaseUrl(), []);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [conversationId, setConversationId] = useState<string>();
  const [draft, setDraft] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [attachments, setAttachments] = useState<PendingAttachment[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([
    {
      id: "api-ready",
      label: "API client ready",
      detail: apiUrl,
      status: "ok"
    }
  ]);

  useEffect(() => {
    const container = messagesContainerRef.current;

    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }, [messages]);

  function handleAttachmentSelection(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);

    if (!files.length) {
      return;
    }

    setAttachments((current) => [
      ...current,
      ...files.map((file) => ({
        id: createId(),
        name: file.name,
        size: file.size,
        type: file.type || "unknown"
      }))
    ]);
    setTimeline((current) => [
      {
        id: createId(),
        label: "Files selected",
        detail: "File reading is locked until the document phase. Nothing was uploaded.",
        status: "pending"
      },
      ...current
    ]);
    event.target.value = "";
  }

  function removeAttachment(id: string) {
    setAttachments((current) => current.filter((file) => file.id !== id));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const message = draft.trim();

    if (!message || isSending || attachments.length > 0) {
      return;
    }

    const userMessage: ChatMessage = {
      id: createId(),
      role: "Kaif",
      text: message
    };
    const requestEventId = createId();

    setDraft("");
    setIsSending(true);
    setMessages((current) => [...current, userMessage]);
    setTimeline((current) => [
      {
        id: requestEventId,
        label: "Chat request sent",
        detail: `${message.length} characters`,
        status: "pending"
      },
      ...current
    ]);

    try {
      const response = await sendChatMessage({
        conversationId,
        message
      });

      setConversationId(response.conversationId);
      setMessages((current) => [
        ...current,
        {
          id: createId(),
          role: "Nami",
          text: response.reply,
          wasTruncated: response.wasTruncated
        }
      ]);
      setTimeline((current) => [
        {
          id: createId(),
          label: "Nami response received",
          detail: response.modelRoute
            ? `${response.modelRoute.taskProfile} via ${response.modelRoute.provider}/${response.modelRoute.model}${
                response.wasTruncated ? " (provider length stop)" : ""
              }`
            : response.actions.length
              ? `${response.actions.length} action previews`
              : "No actions requested",
          status: "ok"
        },
        ...current.filter((item) => item.id !== requestEventId)
      ]);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Nami API request failed unexpectedly.";

      setMessages((current) => [
        ...current,
        {
          id: createId(),
          role: "Nami",
          text: message,
          tone: "error"
        }
      ]);
      setTimeline((current) => [
        {
          id: createId(),
          label: "Chat request failed",
          detail: message,
          status: "error"
        },
        ...current.filter((item) => item.id !== requestEventId)
      ]);
    } finally {
      setIsSending(false);
    }
  }

  return (
    <AppShell
      title="Chat"
      description="Phase 2 chat flow connected to the local backend API."
    >
      <div className="grid min-h-[34rem] gap-4 xl:grid-cols-[18rem_1fr_20rem]">
        <Card>
          <CardHeader>
            <CardTitle>Conversations</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <button
              className="rounded-lg border border-border bg-secondary px-3 py-2 text-left text-sm font-medium text-foreground"
              type="button"
            >
              Nami live chat
            </button>
            {["Build planning", "Safety notes", "Project ideas"].map((item) => (
              <button
                key={item}
                className="rounded-lg border border-border bg-background px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-accent"
                type="button"
              >
                {item}
              </button>
            ))}
          </CardContent>
        </Card>

        <Card className="flex flex-col">
          <CardHeader className="flex-row items-center justify-between gap-3">
            <CardTitle>Nami conversation</CardTitle>
            <Badge variant={isSending ? "secondary" : "default"}>
              {isSending ? "Thinking" : "API live"}
            </Badge>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col gap-4">
            <div
              className="flex max-h-[28rem] flex-1 flex-col gap-3 overflow-y-auto pr-1"
              ref={messagesContainerRef}
            >
              {messages.map((message) => {
                const Icon = message.role === "Nami" ? Bot : UserRound;
                const isError = message.tone === "error";

                return (
                  <div
                    key={message.id}
                    className={cn(
                      "flex gap-3 rounded-lg border border-border bg-muted/30 p-3",
                      message.role === "Kaif" && "bg-background",
                      isError && "bg-destructive/10"
                    )}
                  >
                    <div
                      className={cn(
                        "flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary",
                        message.role === "Kaif" && "bg-secondary text-foreground",
                        isError && "bg-destructive text-destructive-foreground"
                      )}
                    >
                      <Icon aria-hidden className="size-4" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-foreground">
                        {message.role}
                      </div>
                      <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                        {message.text}
                      </p>
                      {message.wasTruncated ? (
                        <p className="mt-2 text-xs font-medium text-destructive">
                          Provider stopped because of length after automatic
                          continuation. Send continue to keep going.
                        </p>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>

            <form className="flex flex-col gap-2" onSubmit={handleSubmit}>
              <input
                accept=".txt,.md,.pdf,.doc,.docx,image/*"
                className="hidden"
                multiple
                onChange={handleAttachmentSelection}
                ref={fileInputRef}
                type="file"
              />
              <textarea
                aria-label="Message Nami"
                className="min-h-24 w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                disabled={isSending}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Ask Nami something safe..."
                value={draft}
              />
              {attachments.length > 0 ? (
                <div className="rounded-lg border border-dashed border-border bg-secondary/50 p-3">
                  <div className="text-xs font-medium text-foreground">
                    Files are selected but not uploaded yet. File reading is
                    locked until the document phase.
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {attachments.map((file) => (
                      <div
                        className="flex max-w-full items-center gap-2 rounded-md border border-border bg-background px-2 py-1 text-xs text-muted-foreground"
                        key={file.id}
                      >
                        <Paperclip aria-hidden className="size-3 shrink-0" />
                        <span className="truncate">{file.name}</span>
                        <span className="shrink-0">{formatFileSize(file.size)}</span>
                        <button
                          aria-label={`Remove ${file.name}`}
                          className="rounded-sm text-foreground hover:text-primary"
                          onClick={() => removeAttachment(file.id)}
                          type="button"
                        >
                          <X aria-hidden className="size-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs text-muted-foreground">
                  {conversationId
                    ? `Conversation ${conversationId.slice(0, 8)}`
                    : "New conversation"}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    aria-label="Attach files"
                    onClick={() => fileInputRef.current?.click()}
                    title="Attach files"
                    type="button"
                    variant="outline"
                  >
                    <Paperclip aria-hidden className="size-4" />
                  </Button>
                  <Button
                    disabled={!draft.trim() || isSending || attachments.length > 0}
                    type="submit"
                  >
                    {isSending ? (
                      <Loader2 aria-hidden className="size-4 animate-spin" />
                    ) : (
                      <SendHorizontal aria-hidden className="size-4" />
                    )}
                    Send
                  </Button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tool Timeline</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {timeline.map((item) => {
              const Icon =
                item.status === "error"
                  ? AlertTriangle
                  : item.status === "pending"
                    ? Loader2
                    : CheckCircle2;

              return (
                <div
                  key={item.id}
                  className="flex gap-3 rounded-lg border border-border bg-background p-3"
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
                        item.status === "pending" && "animate-spin"
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
