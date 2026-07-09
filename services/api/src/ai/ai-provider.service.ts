import { Inject, Injectable, Logger, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import {
  AI_PROVIDER_NOT_CONFIGURED_MESSAGE,
  AI_PROVIDER_UNAVAILABLE_MESSAGE,
  AiChatMessage,
  AiProviderName,
  AiTaskProfile,
  aiProviderNames,
  GenerateTextInput,
  GenerateTextResult,
  ModelRoute
} from "./ai-provider.types";

type OllamaGenerateResponse = {
  done_reason?: string;
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
    finishReason?: string;
  }>;
};

type OpenAiCompatibleChatResponse = {
  choices?: Array<{
    finish_reason?: string;
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
    const routes = this.getModelRoutes(input.taskProfile ?? "fast");
    let lastError: ServiceUnavailableException | undefined;
    let lastTruncatedResult: GenerateTextResult | undefined;

    for (const route of routes) {
      const routedInput = {
        ...input,
        maxOutputTokens:
          input.maxOutputTokens ??
          this.getConfiguredMaxOutputTokens(route.taskProfile),
        taskProfile: route.taskProfile
      };

      try {
        const result = await this.generateWithRoute(routedInput, route);

        if (!result.wasTruncated) {
          return result;
        }

        lastTruncatedResult = result;
        this.logger.warn(
          `ai.route_truncated taskProfile=${route.taskProfile} provider=${route.provider} model=${route.model}`
        );
      } catch (error) {
        if (error instanceof ServiceUnavailableException) {
          lastError = error;
          this.logger.warn(
            `ai.route_unavailable taskProfile=${route.taskProfile} provider=${route.provider} model=${route.model}`
          );
          continue;
        }

        throw error;
      }
    }

    if (lastTruncatedResult) {
      return lastTruncatedResult;
    }

    throw lastError ?? this.providerUnavailable(routes[0]?.provider ?? "unknown");
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

  getModelRoute(taskProfile: AiTaskProfile = "fast"): ModelRoute {
    const provider = this.getRouteProvider(taskProfile);
    const model = this.getRouteModel(taskProfile, provider);

    return {
      taskProfile,
      provider,
      model
    };
  }

  getModelRoutes(taskProfile: AiTaskProfile = "fast"): ModelRoute[] {
    const primaryRoute = this.getModelRoute(taskProfile);
    const routes = [
      primaryRoute,
      ...this.getFallbackRoutes(taskProfile)
    ];
    const seen = new Set<string>();

    return routes.filter((route) => {
      const key = `${route.provider}:${route.model}`;

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    });
  }

  private async generateWithRoute(
    input: GenerateTextInput,
    route: ModelRoute
  ): Promise<GenerateTextResult> {
    if (route.provider === "ollama") {
      return this.generateWithOllama(input, route);
    }

    if (route.provider === "gemini") {
      return this.generateWithGemini(input, route);
    }

    if (route.provider === "groq") {
      return this.generateWithOpenAiCompatibleProvider(input, {
        apiKeyEnvName: "GROQ_API_KEY",
        baseUrl: "https://api.groq.com/openai/v1",
        model: route.model,
        provider: "groq"
      });
    }

    if (route.provider === "openrouter") {
      return this.generateWithOpenRouter(input, route);
    }

    throw this.providerUnavailable(route.provider);
  }

  private getRouteProvider(taskProfile: AiTaskProfile): AiProviderName {
    const profilePrefix = this.getTaskProfileEnvPrefix(taskProfile);
    const rawProvider = (
      this.config.get<string>(`${profilePrefix}_PROVIDER`) ??
      this.config.get<string>("AI_DEFAULT_PROVIDER") ??
      this.config.get<string>("AI_PROVIDER")
    )
      ?.trim()
      .toLowerCase();

    if (!rawProvider) {
      throw new ServiceUnavailableException({
        code: "AI_PROVIDER_NOT_CONFIGURED",
        message: AI_PROVIDER_NOT_CONFIGURED_MESSAGE,
        details: { taskProfile }
      });
    }

    if (!aiProviderNames.includes(rawProvider as AiProviderName)) {
      throw new ServiceUnavailableException({
        code: "AI_PROVIDER_UNAVAILABLE",
        message: AI_PROVIDER_UNAVAILABLE_MESSAGE,
        details: { provider: rawProvider, taskProfile }
      });
    }

    return rawProvider as AiProviderName;
  }

  private getRouteModel(
    taskProfile: AiTaskProfile,
    provider: AiProviderName
  ): string {
    const profilePrefix = this.getTaskProfileEnvPrefix(taskProfile);
    const model = (
      this.config.get<string>(`${profilePrefix}_MODEL`) ??
      this.getLegacyTaskModel(taskProfile, provider) ??
      this.config.get<string>("AI_DEFAULT_MODEL") ??
      this.getProviderDefaultModel(provider)
    )?.trim();

    if (!model) {
      throw this.providerUnavailable(provider);
    }

    return model;
  }

  private getFallbackRoutes(taskProfile: AiTaskProfile): ModelRoute[] {
    const profilePrefix = this.getTaskProfileEnvPrefix(taskProfile);
    const rawFallbacks =
      this.config.get<string>(`${profilePrefix}_FALLBACKS`) ??
      this.config.get<string>("AI_FALLBACKS") ??
      "";

    return rawFallbacks
      .split(",")
      .map((fallback) => fallback.trim())
      .filter(Boolean)
      .flatMap((fallback) => {
        const separatorIndex = fallback.indexOf(":");

        if (separatorIndex <= 0) {
          this.logger.warn(`ai.fallback_invalid value=${fallback}`);
          return [];
        }

        const provider = fallback.slice(0, separatorIndex).trim().toLowerCase();
        const model = fallback.slice(separatorIndex + 1).trim();

        if (!aiProviderNames.includes(provider as AiProviderName) || !model) {
          this.logger.warn(`ai.fallback_invalid value=${fallback}`);
          return [];
        }

        return [
          {
            model,
            provider: provider as AiProviderName,
            taskProfile
          }
        ];
      });
  }

  private getTaskProfileEnvPrefix(taskProfile: AiTaskProfile) {
    return `AI_${taskProfile.toUpperCase()}`;
  }

  private getLegacyTaskModel(
    taskProfile: AiTaskProfile,
    provider: AiProviderName
  ) {
    if (taskProfile === "coding" && provider === "groq") {
      return this.config.get<string>("GROQ_MODEL_CODING");
    }

    return undefined;
  }

  private getProviderDefaultModel(provider: AiProviderName) {
    const envNames: Record<AiProviderName, string> = {
      gemini: "GEMINI_MODEL",
      groq: "GROQ_MODEL",
      ollama: "OLLAMA_MODEL",
      openai: "OPENAI_MODEL",
      openrouter: "OPENROUTER_MODEL"
    };

    return this.config.get<string>(envNames[provider]);
  }

  private async generateWithOllama(
    input: GenerateTextInput,
    route: ModelRoute
  ): Promise<GenerateTextResult> {
    const baseUrl =
      this.config.get<string>("OLLAMA_BASE_URL")?.trim() ||
      "http://localhost:11434";
    const model = route.model;

    try {
      const response = await fetch(`${baseUrl.replace(/\/$/, "")}/api/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model,
          prompt: this.buildPromptFromMessages(input),
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
        model: payload.model ?? model,
        taskProfile: route.taskProfile,
        finishReason: payload.done_reason,
        wasTruncated: this.isTruncatedFinishReason(payload.done_reason)
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
    input: GenerateTextInput,
    route: ModelRoute
  ): Promise<GenerateTextResult> {
    const apiKey = this.config.get<string>("GEMINI_API_KEY")?.trim();
    const model = route.model;

    if (!apiKey) {
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
              ...this.buildGeminiContents(input)
            ],
            generationConfig: this.buildGenerationConfig(input)
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
        model,
        taskProfile: route.taskProfile,
        finishReason: payload.candidates?.[0]?.finishReason,
        wasTruncated: this.isTruncatedFinishReason(
          payload.candidates?.[0]?.finishReason
        )
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
    input: GenerateTextInput,
    route: ModelRoute
  ): Promise<GenerateTextResult> {
    const apiKey = this.config.get<string>("OPENROUTER_API_KEY")?.trim();
    const model = route.model;

    if (!apiKey) {
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
            messages: this.buildOpenAiCompatibleMessages(input),
            temperature: 0.4,
            ...(input.maxOutputTokens
              ? { max_tokens: input.maxOutputTokens }
              : {})
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
        model: payload.model ?? model,
        taskProfile: input.taskProfile ?? "fast",
        finishReason: payload.choices?.[0]?.finish_reason,
        wasTruncated: this.isTruncatedFinishReason(
          payload.choices?.[0]?.finish_reason
        )
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

  private getConfiguredMaxOutputTokens(taskProfile: AiTaskProfile) {
    const profilePrefix = this.getTaskProfileEnvPrefix(taskProfile);
    const configured =
      this.config.get<string>(`${profilePrefix}_MAX_OUTPUT_TOKENS`) ??
      this.config.get<string>("AI_MAX_OUTPUT_TOKENS");
    const parsed = configured ? Number(configured) : undefined;

    if (parsed && Number.isFinite(parsed)) {
      return Math.min(8192, Math.max(256, Math.trunc(parsed)));
    }

    return undefined;
  }

  private buildGenerationConfig(input: GenerateTextInput) {
    return {
      temperature: 0.4,
      ...(input.maxOutputTokens
        ? { maxOutputTokens: input.maxOutputTokens }
        : {})
    };
  }

  private buildPromptFromMessages(input: GenerateTextInput) {
    return this.getConversationMessages(input)
      .map((message) => `${message.role === "assistant" ? "Nami" : "Kaif"}: ${message.content}`)
      .join("\n\n");
  }

  private buildGeminiContents(input: GenerateTextInput) {
    return this.getConversationMessages(input).map((message) => ({
      role: message.role === "assistant" ? "model" : "user",
      parts: [{ text: message.content }]
    }));
  }

  private buildOpenAiCompatibleMessages(input: GenerateTextInput) {
    return [
      { role: "system", content: input.instructions },
      ...this.getConversationMessages(input)
    ];
  }

  private getConversationMessages(input: GenerateTextInput): AiChatMessage[] {
    const messages = input.messages?.length
      ? input.messages
      : [{ role: "user" as const, content: input.input }];

    return messages
      .map((message) => ({
        role: message.role,
        content: message.content.trim()
      }))
      .filter((message) => message.content.length > 0);
  }

  private isTruncatedFinishReason(reason?: string) {
    const normalized = reason?.toLowerCase();

    return (
      normalized === "length" ||
      normalized === "max_tokens" ||
      normalized === "max_output_tokens" ||
      normalized === "max_tokens_reached"
    );
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
