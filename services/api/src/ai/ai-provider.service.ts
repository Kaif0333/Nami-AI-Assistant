import { Inject, Injectable, Logger, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import {
  AI_PROVIDER_NOT_CONFIGURED_MESSAGE,
  AI_PROVIDER_UNAVAILABLE_MESSAGE,
  AiProviderName,
  aiProviderNames,
  GenerateTextInput,
  GenerateTextResult
} from "./ai-provider.types";

type OllamaGenerateResponse = {
  response?: string;
  model?: string;
};

type GeminiGenerateResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
};

type OpenAiCompatibleChatResponse = {
  choices?: Array<{
    message?: {
      content?: string | Array<{ text?: string }>;
    };
  }>;
  model?: string;
};

@Injectable()
export class AiProviderService {
  private readonly logger = new Logger(AiProviderService.name);

  constructor(@Inject(ConfigService) private readonly config: ConfigService) {}

  async generateText(input: GenerateTextInput): Promise<GenerateTextResult> {
    const provider = this.getSelectedProvider();

    if (provider === "ollama") {
      return this.generateWithOllama(input);
    }

    if (provider === "gemini") {
      return this.generateWithGemini(input);
    }

    if (provider === "groq") {
      return this.generateWithOpenAiCompatibleProvider(input, {
        apiKeyEnvName: "GROQ_API_KEY",
        baseUrl: "https://api.groq.com/openai/v1",
        modelEnvName: "GROQ_MODEL",
        provider: "groq"
      });
    }

    if (provider === "openrouter") {
      return this.generateWithOpenRouter(input);
    }

    throw this.providerUnavailable(provider);
  }

  getSelectedProvider(): AiProviderName {
    const rawProvider = this.config.get<string>("AI_PROVIDER")?.trim().toLowerCase();

    if (!rawProvider) {
      throw new ServiceUnavailableException({
        code: "AI_PROVIDER_NOT_CONFIGURED",
        message: AI_PROVIDER_NOT_CONFIGURED_MESSAGE,
        details: {}
      });
    }

    if (!aiProviderNames.includes(rawProvider as AiProviderName)) {
      throw new ServiceUnavailableException({
        code: "AI_PROVIDER_UNAVAILABLE",
        message: AI_PROVIDER_UNAVAILABLE_MESSAGE,
        details: { provider: rawProvider }
      });
    }

    return rawProvider as AiProviderName;
  }

  private async generateWithOllama(
    input: GenerateTextInput
  ): Promise<GenerateTextResult> {
    const baseUrl =
      this.config.get<string>("OLLAMA_BASE_URL")?.trim() ||
      "http://localhost:11434";
    const model = this.config.get<string>("OLLAMA_MODEL")?.trim();

    if (!model) {
      throw this.providerUnavailable("ollama");
    }

    try {
      const response = await fetch(`${baseUrl.replace(/\/$/, "")}/api/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model,
          prompt: input.input,
          system: input.instructions,
          stream: false
        })
      });

      if (!response.ok) {
        this.logger.warn(`ollama.unavailable status=${response.status}`);
        throw this.providerUnavailable("ollama");
      }

      const payload = (await response.json()) as OllamaGenerateResponse;
      const text = payload.response?.trim();

      if (!text) {
        throw this.providerUnavailable("ollama");
      }

      return {
        text,
        provider: "ollama",
        model: payload.model ?? model
      };
    } catch (error) {
      if (error instanceof ServiceUnavailableException) {
        throw error;
      }

      this.logger.warn(
        `ollama.request_failed message=${error instanceof Error ? error.message : "unknown"}`
      );
      throw this.providerUnavailable("ollama");
    }
  }

  private async generateWithGemini(
    input: GenerateTextInput
  ): Promise<GenerateTextResult> {
    const apiKey = this.config.get<string>("GEMINI_API_KEY")?.trim();
    const model = this.config.get<string>("GEMINI_MODEL")?.trim();

    if (!apiKey || !model) {
      throw this.providerUnavailable("gemini");
    }

    try {
      const modelPath = this.toGeminiModelPath(model);
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/${modelPath}:generateContent?key=${encodeURIComponent(apiKey)}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            systemInstruction: {
              parts: [{ text: input.instructions }]
            },
            contents: [
              {
                role: "user",
                parts: [{ text: input.input }]
              }
            ],
            generationConfig: {
              temperature: 0.4,
              maxOutputTokens: 768
            }
          })
        }
      );

      if (!response.ok) {
        this.logger.warn(`gemini.unavailable status=${response.status}`);
        throw this.providerUnavailable("gemini");
      }

      const payload = (await response.json()) as GeminiGenerateResponse;
      const text = payload.candidates?.[0]?.content?.parts
        ?.map((part) => part.text ?? "")
        .join("")
        .trim();

      if (!text) {
        throw this.providerUnavailable("gemini");
      }

      return {
        text,
        provider: "gemini",
        model
      };
    } catch (error) {
      if (error instanceof ServiceUnavailableException) {
        throw error;
      }

      this.logger.warn(
        `gemini.request_failed message=${error instanceof Error ? error.message : "unknown"}`
      );
      throw this.providerUnavailable("gemini");
    }
  }

  private async generateWithOpenRouter(
    input: GenerateTextInput
  ): Promise<GenerateTextResult> {
    const apiKey = this.config.get<string>("OPENROUTER_API_KEY")?.trim();
    const model = this.config.get<string>("OPENROUTER_MODEL")?.trim();

    if (!apiKey || !model) {
      throw this.providerUnavailable("openrouter");
    }

    return this.generateWithOpenAiCompatibleProvider(input, {
      apiKey,
      baseUrl: "https://openrouter.ai/api/v1",
      headers: {
        "HTTP-Referer": this.config.get<string>("APP_URL") ?? "http://localhost:3000",
        "X-Title": this.config.get<string>("APP_NAME") ?? "Nami AI Assistant"
      },
      model,
      provider: "openrouter"
    });
  }

  private async generateWithOpenAiCompatibleProvider(
    input: GenerateTextInput,
    options: {
      apiKey?: string;
      apiKeyEnvName?: string;
      baseUrl: string;
      headers?: Record<string, string>;
      model?: string;
      modelEnvName?: string;
      provider: "groq" | "openrouter";
    }
  ): Promise<GenerateTextResult> {
    const apiKey =
      options.apiKey ?? this.config.get<string>(options.apiKeyEnvName ?? "")?.trim();
    const model =
      options.model ?? this.config.get<string>(options.modelEnvName ?? "")?.trim();

    if (!apiKey || !model) {
      throw this.providerUnavailable(options.provider);
    }

    try {
      const response = await fetch(
        `${options.baseUrl.replace(/\/$/, "")}/chat/completions`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            ...options.headers
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: "system", content: input.instructions },
              { role: "user", content: input.input }
            ],
            temperature: 0.4,
            max_tokens: 768
          })
        }
      );

      if (!response.ok) {
        this.logger.warn(`${options.provider}.unavailable status=${response.status}`);
        throw this.providerUnavailable(options.provider);
      }

      const payload = (await response.json()) as OpenAiCompatibleChatResponse;
      const text = this.extractChatText(payload);

      if (!text) {
        throw this.providerUnavailable(options.provider);
      }

      return {
        text,
        provider: options.provider,
        model: payload.model ?? model
      };
    } catch (error) {
      if (error instanceof ServiceUnavailableException) {
        throw error;
      }

      this.logger.warn(
        `${options.provider}.request_failed message=${error instanceof Error ? error.message : "unknown"}`
      );
      throw this.providerUnavailable(options.provider);
    }
  }

  private extractChatText(payload: OpenAiCompatibleChatResponse) {
    const content = payload.choices?.[0]?.message?.content;

    if (typeof content === "string") {
      return content.trim();
    }

    if (Array.isArray(content)) {
      return content
        .map((part) => part.text ?? "")
        .join("")
        .trim();
    }

    return "";
  }

  private toGeminiModelPath(model: string) {
    const modelPath = model.startsWith("models/") ? model : `models/${model}`;

    return modelPath
      .split("/")
      .map((segment) => encodeURIComponent(segment))
      .join("/");
  }

  private providerUnavailable(provider: string) {
    return new ServiceUnavailableException({
      code: "AI_PROVIDER_UNAVAILABLE",
      message: AI_PROVIDER_UNAVAILABLE_MESSAGE,
      details: { provider }
    });
  }
}
