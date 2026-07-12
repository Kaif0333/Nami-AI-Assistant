export type ChatResearchMetadata = {
  runId: string;
  mode: "fast" | "deep";
  status: "pending" | "running" | "completed" | "partial" | "failed";
  sources: Array<{
    title: string;
    url: string;
    domain: string;
  }>;
  warnings: string[];
};

export type ResearchMode = "fast" | "deep";

export type ResearchStatus =
  | "pending"
  | "running"
  | "completed"
  | "partial"
  | "failed";

export type ResearchSource = {
  id: string;
  url: string;
  title: string;
  domain: string;
  snippet: string;
  publishedAt: string | null;
  retrievedAt: string;
  sourceType: "web" | "url_context";
};

export type ResearchRun = {
  id: string;
  query: string;
  mode: ResearchMode;
  status: ResearchStatus;
  summary: string;
  keyFindings: string[];
  recommendations: string[];
  risks: string[];
  actionPlan: string[];
  provider: string;
  model: string;
  searchQueries: string[];
  warnings: string[];
  errorMessage: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  sources: ResearchSource[];
};

export type ResearchStatusData = {
  provider: string;
  configured: boolean;
  model: string;
  supportedModes: ResearchMode[];
  supportsUrlContext: boolean;
  maxUrls: number;
  requestTimeoutMs: number;
};

const maxResearchMetadataSources = 5;
const maxResearchMetadataWarnings = 5;
const maxResearchMetadataTitleCharacters = 160;
const maxResearchMetadataDomainCharacters = 120;
const maxResearchMetadataUrlCharacters = 500;
const maxResearchMetadataWarningCharacters = 300;
const maxResearchPathnameDecodeRounds = 4;
const reservedResearchHostnamePattern =
  /(?:^|\.)(?:localhost|local|internal|test|example|invalid|home|lan|onion)$/i;
const literalIpAddressPattern =
  /^(?:\d{1,3}\.){3}\d{1,3}$|^\[[0-9a-f:.]+\]$/i;
const secretLikeResearchPathPattern =
  /(?:^|[\\/])(?:api[_-]?key|secrets?|(?:access[_-]?)?tokens?|passwords?|credentials?|authorization|cookie)(?:[\\/:=]|$)/i;
const secretLikeResearchValuePattern =
  /(sk-[A-Za-z0-9_-]{10,}|ghp_[A-Za-z0-9_]{10,}|xox[baprs]-[A-Za-z0-9-]{10,}|(api[_ -]?key|secret|token|password|credential|authorization|cookie)\s*[:=]\s*\S+)/i;

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
  research?: ChatResearchMetadata;
  wasTruncated?: boolean;
};

export type ChatStoredMessage = {
  id: string;
  conversationId: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  metadata: Record<string, unknown>;
  research?: ChatResearchMetadata;
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
    provider: "openai" | "groq";
    configured: boolean;
    model: string;
    maxAudioBytes: number;
    supportedMimeTypes: string[];
  };
  tts: {
    provider: "openai" | "groq" | "browser";
    configured: boolean;
    model: string;
    voice: string;
    responseFormat: "mp3" | "wav" | "browser";
    fallbackProvider: "browser" | null;
    clientSide: boolean;
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
  provider: "openai" | "groq";
  model: string;
  durationMs?: number;
};

export type VoiceSpeechResult = {
  audioBase64: string | null;
  mimeType: "audio/mpeg" | "audio/wav" | "browser/speech-synthesis";
  provider: "openai" | "groq" | "browser";
  model: string;
  voice: string;
  clientSide: boolean;
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
  const conversation = await apiRequest<ChatConversationDetail>(
    `/chat/conversations/${id}`
  );

  return {
    ...conversation,
    messages: conversation.messages.map((message) => ({
      ...message,
      research: sanitizeChatResearchMetadata(message.metadata.research)
    }))
  };
}

export async function getResearchStatus() {
  return apiRequest<ResearchStatusData>("/research/status");
}

export async function runResearch(input: {
  query: string;
  mode: ResearchMode;
  urls?: string[];
}) {
  return apiRequest<ResearchRun>("/research", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export async function listResearchRuns(filters?: {
  mode?: ResearchMode;
  status?: ResearchStatus;
  query?: string;
}) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(filters ?? {})) {
    if (value) {
      params.set(key, value);
    }
  }

  const query = params.size ? `?${params.toString()}` : "";
  const data = await apiRequest<{ researchRuns: ResearchRun[] }>(
    `/research${query}`
  );

  return data.researchRuns;
}

export async function getResearchRun(id: string) {
  return apiRequest<ResearchRun>(`/research/${encodeURIComponent(id)}`);
}

export function sanitizeChatResearchMetadata(value: unknown) {
  if (!isRecord(value)) {
    return undefined;
  }

  const { runId, mode, status, sources, warnings } = value;

  if (
    typeof runId !== "string" ||
    (mode !== "fast" && mode !== "deep") ||
    !isResearchStatus(status) ||
    !Array.isArray(sources) ||
    !Array.isArray(warnings) ||
    !warnings.every((warning) => typeof warning === "string")
  ) {
    return undefined;
  }

  const parsedSources = sources
    .flatMap(sanitizeChatResearchSource)
    .slice(0, maxResearchMetadataSources);
  const parsedWarnings = warnings
    .filter((warning): warning is string => typeof warning === "string")
    .slice(0, maxResearchMetadataWarnings)
    .map((warning) =>
      redactChatResearchMetadataText(
        warning,
        maxResearchMetadataWarningCharacters
      )
    );

  return {
    runId,
    mode,
    status,
    sources: parsedSources,
    warnings: parsedWarnings
  } satisfies ChatResearchMetadata;
}

function sanitizeChatResearchSource(value: unknown) {
  if (
    !isRecord(value) ||
    typeof value.title !== "string" ||
    typeof value.url !== "string" ||
    typeof value.domain !== "string"
  ) {
    return [];
  }

  const url = sanitizePublicResearchUrl(value.url);

  if (!url) {
    return [];
  }

  return [
    {
      title: redactChatResearchMetadataText(
        value.title,
        maxResearchMetadataTitleCharacters
      ),
      url,
      domain: redactChatResearchMetadataText(
        new URL(url).hostname,
        maxResearchMetadataDomainCharacters
      )
    }
  ];
}

export function sanitizePublicResearchUrl(value: string) {
  try {
    const parsed = new URL(value);

    if (
      (parsed.protocol !== "http:" && parsed.protocol !== "https:") ||
      parsed.username ||
      parsed.password ||
      !isPublicResearchHostname(parsed.hostname)
    ) {
      return undefined;
    }

    const hostname = decodeResearchComponent(parsed.hostname);
    const pathname = decodeResearchComponent(parsed.pathname);
    const query = decodeResearchComponent(parsed.search);
    const fragment = decodeResearchComponent(parsed.hash);

    if (
      !hostname ||
      !pathname ||
      query === undefined ||
      fragment === undefined ||
      [hostname, pathname, query, fragment].some(isSecretLikeResearchValue) ||
      secretLikeResearchPathPattern.test(pathname)
    ) {
      return undefined;
    }

    const sanitized = `${parsed.origin}${parsed.pathname}`;

    return sanitized.length <= maxResearchMetadataUrlCharacters
      ? sanitized
      : undefined;
  } catch {
    return undefined;
  }
}

function isPublicResearchHostname(value: string) {
  const hostname = value.toLowerCase().replace(/\.$/, "");

  return (
    hostname.includes(".") &&
    !literalIpAddressPattern.test(hostname) &&
    !reservedResearchHostnamePattern.test(hostname) &&
    !isSecretLikeResearchValue(hostname)
  );
}

function redactChatResearchMetadataText(value: string, limit: number) {
  const decoded = decodeResearchComponent(value);

  if (
    !decoded ||
    isSecretLikeResearchValue(value) ||
    isSecretLikeResearchValue(decoded)
  ) {
    return "[redacted]";
  }

  return truncateChatResearchMetadataText(value, limit);
}

function isSecretLikeResearchValue(value: string) {
  return secretLikeResearchValuePattern.test(value);
}

function decodeResearchComponent(value: string) {
  let decoded = value;

  for (let round = 0; round < maxResearchPathnameDecodeRounds; round += 1) {
    try {
      const next = decodeURIComponent(decoded);

      if (next === decoded) {
        return decoded;
      }

      decoded = next;
    } catch {
      return undefined;
    }
  }

  return /%[0-9A-Fa-f]{2}/.test(decoded) ? undefined : decoded;
}

function truncateChatResearchMetadataText(value: string, limit: number) {
  const normalized = value.replaceAll(/\s+/g, " ").trim();

  return normalized.length > limit ? normalized.slice(0, limit) : normalized;
}

function isResearchStatus(
  value: unknown
): value is ChatResearchMetadata["status"] {
  return ["pending", "running", "completed", "partial", "failed"].includes(
    value as ChatResearchMetadata["status"]
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
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
