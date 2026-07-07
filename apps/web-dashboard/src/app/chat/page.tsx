"use client";

import { FormEvent, useMemo, useState } from "react";
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  Loader2,
  SendHorizontal,
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
};

type TimelineEvent = {
  id: string;
  label: string;
  detail: string;
  status: "ok" | "pending" | "error";
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

export default function ChatPage() {
  const apiUrl = useMemo(() => getApiBaseUrl(), []);
  const [conversationId, setConversationId] = useState<string>();
  const [draft, setDraft] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([
    {
      id: "api-ready",
      label: "API client ready",
      detail: apiUrl,
      status: "ok"
    }
  ]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const message = draft.trim();

    if (!message || isSending) {
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
          text: response.reply
        }
      ]);
      setTimeline((current) => [
        {
          id: createId(),
          label: "Nami response received",
          detail: response.actions.length
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
            <div className="flex max-h-[28rem] flex-1 flex-col gap-3 overflow-y-auto pr-1">
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
                    </div>
                  </div>
                );
              })}
            </div>

            <form className="flex flex-col gap-2" onSubmit={handleSubmit}>
              <textarea
                aria-label="Message Nami"
                className="min-h-24 w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                disabled={isSending}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Ask Nami something safe..."
                value={draft}
              />
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs text-muted-foreground">
                  {conversationId
                    ? `Conversation ${conversationId.slice(0, 8)}`
                    : "New conversation"}
                </p>
                <Button disabled={!draft.trim() || isSending} type="submit">
                  {isSending ? (
                    <Loader2 aria-hidden className="size-4 animate-spin" />
                  ) : (
                    <SendHorizontal aria-hidden className="size-4" />
                  )}
                  Send
                </Button>
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
