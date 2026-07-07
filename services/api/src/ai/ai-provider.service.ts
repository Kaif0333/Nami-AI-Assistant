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

@Injectable()
export class AiProviderService {
  private readonly logger = new Logger(AiProviderService.name);

  constructor(@Inject(ConfigService) private readonly config: ConfigService) {}

  async generateText(input: GenerateTextInput): Promise<GenerateTextResult> {
    const provider = this.getSelectedProvider();

    if (provider === "ollama") {
      return this.generateWithOllama(input);
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

  private providerUnavailable(provider: string) {
    return new ServiceUnavailableException({
      code: "AI_PROVIDER_UNAVAILABLE",
      message: AI_PROVIDER_UNAVAILABLE_MESSAGE,
      details: { provider }
    });
  }
}
