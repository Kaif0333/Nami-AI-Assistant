import { ModelRoute } from "../ai/ai-provider.types";

export type StoredChatRole = "user" | "assistant";

export type ChatAction = {
  type: string;
  status:
    | "approval_required"
    | "blocked"
    | "planned"
    | "completed"
    | "failed"
    | "none";
  summary: string;
  approvalId?: string;
};

export type ChatResponseData = {
  reply: string;
  conversationId: string;
  actions: ChatAction[];
  finishReason?: string;
  modelRoute?: ModelRoute;
  wasTruncated?: boolean;
};

export type ChatMessageRecord = {
  id: string;
  conversationId: string;
  role: StoredChatRole;
  content: string;
  createdAt: string;
  metadata: Record<string, unknown>;
};

export type ChatConversationSummary = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
  lastMessagePreview: string;
  metadata: Record<string, unknown>;
};

export type ChatConversationDetail = ChatConversationSummary & {
  messages: ChatMessageRecord[];
};
