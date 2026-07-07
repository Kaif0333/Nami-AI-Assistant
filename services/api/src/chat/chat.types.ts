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
};
