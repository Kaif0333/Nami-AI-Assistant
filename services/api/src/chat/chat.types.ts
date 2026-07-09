import { ModelRoute } from "../ai/ai-provider.types";

export type ChatAction = {
  type: string;
  status: "approval_required" | "blocked" | "planned" | "none";
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
