export type ChatResponseData = {
  reply: string;
  conversationId: string;
  actions: Array<{
    type: string;
    status: string;
    summary: string;
  }>;
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

export async function sendChatMessage(input: {
  conversationId?: string;
  message: string;
}) {
  const response = await fetch(`${apiBaseUrl}/api/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      conversationId: input.conversationId,
      message: input.message,
      mode: "chat"
    })
  });

  const payload = (await response.json().catch(() => null)) as
    | ApiSuccess<ChatResponseData>
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
