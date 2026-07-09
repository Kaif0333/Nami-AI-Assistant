export type ChatResponseData = {
  reply: string;
  conversationId: string;
  actions: Array<{
    type: string;
    status: string;
    summary: string;
  }>;
  finishReason?: string;
  modelRoute?: {
    taskProfile: "fast" | "coding" | "reasoning" | "research" | "local";
    provider: string;
    model: string;
  };
  wasTruncated?: boolean;
};

export type ChatStoredMessage = {
  id: string;
  conversationId: string;
  role: "user" | "assistant";
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
  messages: ChatStoredMessage[];
};

export type RiskLevel = "low" | "medium" | "high" | "blocked";

export type ApprovalStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "expired"
  | "completed"
  | "failed"
  | "cancelled";

export type ActionLogStatus =
  | "planned"
  | "approval_required"
  | "approved"
  | "rejected"
  | "running"
  | "completed"
  | "failed"
  | "cancelled"
  | "blocked";

export type ApprovalRequest = {
  id: string;
  actionType: string;
  summary: string;
  description: string;
  payloadPreview: Record<string, unknown>;
  riskLevel: RiskLevel;
  status: ApprovalStatus;
  requestedBy: string;
  createdAt: string;
  approvedAt: string | null;
  rejectedAt: string | null;
  completedAt: string | null;
  errorMessage: string | null;
  metadata: Record<string, unknown>;
};

export type ActionLog = {
  id: string;
  commandId: string | null;
  approvalId: string | null;
  actionType: string;
  summary: string;
  status: ActionLogStatus;
  riskLevel: RiskLevel;
  inputPreview: Record<string, unknown>;
  outputPreview: Record<string, unknown>;
  errorMessage: string | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  metadata: Record<string, unknown>;
};

export type MemoryType =
  | "profile"
  | "project"
  | "job"
  | "client"
  | "preference"
  | "conversation"
  | "document"
  | "automation"
  | "general";

export type MemorySensitivity = "public" | "personal" | "sensitive";

export type MemoryStatus = "active" | "disabled" | "archived";

export type MemoryRecord = {
  id: string;
  type: MemoryType;
  title: string;
  content: string;
  tags: string[];
  source: string;
  sensitivity: MemorySensitivity;
  status: MemoryStatus;
  createdAt: string;
  updatedAt: string;
  metadata: Record<string, unknown>;
  hasEmbedding: boolean;
};

export type MemoryVectorStatus = {
  databaseConfigured: boolean;
  pgvectorSchemaReady: boolean;
  embeddingModelConfigured: boolean;
  semanticSearchEnabled: boolean;
  message: string;
};

export type VoiceStatus = {
  mode: "push_to_talk";
  stt: {
    provider: "openai";
    configured: boolean;
    model: string;
    maxAudioBytes: number;
    supportedMimeTypes: string[];
  };
  tts: {
    provider: "openai";
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
  provider: "openai";
  model: string;
  durationMs?: number;
};

export type VoiceSpeechResult = {
  audioBase64: string;
  mimeType: "audio/mpeg";
  provider: "openai";
  model: string;
  voice: string;
};

type ApiSuccess<T> = {
  success: true;
  data: T;
};

type ApiFailure = {
  success: false;
  error: {
    code: string;
    message: string;
    details: Record<string, unknown>;
  };
};

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export function getApiBaseUrl() {
  return apiBaseUrl;
}

async function apiRequest<T>(path: string, init?: RequestInit) {
  const headers = new Headers(init?.headers);
  headers.set("Content-Type", "application/json");

  const response = await fetch(`${apiBaseUrl}/api${path}`, {
    ...init,
    headers
  });

  const payload = (await response.json().catch(() => null)) as
    | ApiSuccess<T>
    | ApiFailure
    | null;

  if (!response.ok || !payload?.success) {
    throw new Error(
      payload && "error" in payload
        ? payload.error.message
        : "Nami API request failed."
    );
  }

  return payload.data;
}

export async function sendChatMessage(input: {
  conversationId?: string;
  message: string;
}) {
  return apiRequest<ChatResponseData>("/chat", {
    method: "POST",
    body: JSON.stringify({
      conversationId: input.conversationId,
      message: input.message,
      mode: "chat"
    })
  });
}

export async function listChatConversations() {
  const data = await apiRequest<{ conversations: ChatConversationSummary[] }>(
    "/chat/conversations"
  );

  return data.conversations;
}

export async function getChatConversation(id: string) {
  return apiRequest<ChatConversationDetail>(`/chat/conversations/${id}`);
}

export async function listApprovals(filters?: {
  status?: string;
  riskLevel?: string;
  actionType?: string;
}) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(filters ?? {})) {
    if (value) {
      params.set(key, value);
    }
  }

  const query = params.size ? `?${params.toString()}` : "";
  const data = await apiRequest<{ approvals: ApprovalRequest[] }>(
    `/approvals${query}`
  );

  return data.approvals;
}

export async function createDemoSendEmailApproval() {
  return apiRequest<ApprovalRequest>("/approvals/demo-send-email", {
    method: "POST",
    body: JSON.stringify({})
  });
}

export async function approveApproval(id: string) {
  return apiRequest<ApprovalRequest>(`/approvals/${id}/approve`, {
    method: "POST",
    body: JSON.stringify({})
  });
}

export async function rejectApproval(id: string, reason?: string) {
  return apiRequest<ApprovalRequest>(`/approvals/${id}/reject`, {
    method: "POST",
    body: JSON.stringify({ reason })
  });
}

export async function listActionLogs(filters?: {
  status?: string;
  riskLevel?: string;
  actionType?: string;
}) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(filters ?? {})) {
    if (value) {
      params.set(key, value);
    }
  }

  const query = params.size ? `?${params.toString()}` : "";
  const data = await apiRequest<{ logs: ActionLog[] }>(`/action-logs${query}`);

  return data.logs;
}

export async function listMemories(filters?: {
  type?: string;
  sensitivity?: string;
  status?: string;
  query?: string;
  tag?: string;
}) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(filters ?? {})) {
    if (value) {
      params.set(key, value);
    }
  }

  const query = params.size ? `?${params.toString()}` : "";
  const data = await apiRequest<{ memories: MemoryRecord[] }>(
    `/memories${query}`
  );

  return data.memories;
}

export async function getMemoryVectorStatus() {
  return apiRequest<MemoryVectorStatus>("/memories/vector-status");
}

export async function getVoiceStatus() {
  return apiRequest<VoiceStatus>("/voice/status");
}

export async function transcribeVoice(input: {
  audioBase64: string;
  mimeType: string;
  fileName?: string;
  durationMs?: number;
}) {
  return apiRequest<VoiceTranscriptionResult>("/voice/transcriptions", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export async function synthesizeVoice(input: { text: string; voice?: string }) {
  return apiRequest<VoiceSpeechResult>("/voice/speech", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export async function createMemory(input: {
  type: MemoryType;
  title: string;
  content: string;
  tags?: string[];
  source?: string;
  sensitivity?: MemorySensitivity;
}) {
  return apiRequest<MemoryRecord>("/memories", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export async function updateMemory(
  id: string,
  input: Partial<{
    type: MemoryType;
    title: string;
    content: string;
    tags: string[];
    source: string;
    sensitivity: MemorySensitivity;
    status: MemoryStatus;
  }>
) {
  return apiRequest<MemoryRecord>(`/memories/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input)
  });
}

export async function disableMemory(id: string) {
  return apiRequest<MemoryRecord>(`/memories/${id}/disable`, {
    method: "POST",
    body: JSON.stringify({})
  });
}

export async function deleteMemory(id: string) {
  return apiRequest<MemoryRecord>(`/memories/${id}`, {
    method: "DELETE"
  });
}
