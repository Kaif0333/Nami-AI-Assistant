export const aiProviderNames = [
  "ollama",
  "gemini",
  "groq",
  "openrouter",
  "openai"
] as const;

export type AiProviderName = (typeof aiProviderNames)[number];

export type GenerateTextInput = {
  instructions: string;
  input: string;
};

export type GenerateTextResult = {
  text: string;
  provider: AiProviderName;
  model: string;
};

export const AI_PROVIDER_NOT_CONFIGURED_MESSAGE =
  "AI provider is not configured. Please configure Ollama, Gemini, Groq, OpenRouter, or OpenAI.";

export const AI_PROVIDER_UNAVAILABLE_MESSAGE =
  "Selected AI provider is unavailable. Please check the provider setup and try again.";
