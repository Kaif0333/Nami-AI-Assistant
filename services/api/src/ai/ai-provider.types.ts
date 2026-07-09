export const aiProviderNames = [
  "ollama",
  "gemini",
  "groq",
  "openrouter",
  "openai"
] as const;

export type AiProviderName = (typeof aiProviderNames)[number];

export const aiTaskProfiles = [
  "fast",
  "coding",
  "reasoning",
  "research",
  "local"
] as const;

export type AiTaskProfile = (typeof aiTaskProfiles)[number];

export type ModelRoute = {
  taskProfile: AiTaskProfile;
  provider: AiProviderName;
  model: string;
};

export type AiChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export type GenerateTextInput = {
  instructions: string;
  input: string;
  messages?: AiChatMessage[];
  maxOutputTokens?: number;
  taskProfile?: AiTaskProfile;
};

export type GenerateTextResult = {
  text: string;
  provider: AiProviderName;
  model: string;
  taskProfile: AiTaskProfile;
  finishReason?: string;
  wasTruncated?: boolean;
};

export const AI_PROVIDER_NOT_CONFIGURED_MESSAGE =
  "AI provider is not configured. Please configure Ollama, Gemini, Groq, OpenRouter, or OpenAI.";

export const AI_PROVIDER_UNAVAILABLE_MESSAGE =
  "Selected AI provider is unavailable. Please check the provider setup and try again.";
