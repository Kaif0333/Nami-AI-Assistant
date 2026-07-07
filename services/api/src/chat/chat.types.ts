export type ChatAction = {
  type: string;
  status: "blocked" | "planned" | "none";
  summary: string;
};

export type ChatResponseData = {
  reply: string;
  conversationId: string;
  actions: ChatAction[];
};
