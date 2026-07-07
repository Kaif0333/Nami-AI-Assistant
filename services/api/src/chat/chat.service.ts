import {
  BadGatewayException,
  BadRequestException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
  ServiceUnavailableException
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import OpenAI from "openai";
import { randomUUID } from "node:crypto";

import { ChatRequestDto } from "./dto/chat-request.dto";
import { NAMI_CHAT_INSTRUCTIONS } from "./nami-chat.prompt";
import { ChatResponseData } from "./chat.types";

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);
  private readonly client: OpenAI | null;
  private readonly model: string;

  constructor(@Inject(ConfigService) private readonly config: ConfigService) {
    const apiKey = this.config.get<string>("OPENAI_API_KEY")?.trim();

    this.client = apiKey ? new OpenAI({ apiKey }) : null;
    this.model = this.config.get<string>("OPENAI_DEFAULT_MODEL") ?? "gpt-5.5";
  }

  async sendMessage(input: ChatRequestDto): Promise<ChatResponseData> {
    const message = input.message.trim();
    const conversationId = input.conversationId?.trim() || randomUUID();

    if (!message) {
      throw new BadRequestException({
        code: "EMPTY_MESSAGE",
        message: "Message is required.",
        details: {}
      });
    }

    this.logger.log(
      `chat.request conversationId=${conversationId} mode=${input.mode} chars=${message.length}`
    );

    if (!this.client) {
      throw new ServiceUnavailableException({
        code: "OPENAI_API_KEY_MISSING",
        message: "OpenAI API key is not configured for the Nami API service.",
        details: {}
      });
    }

    try {
      const response = await this.client.responses.create({
        model: this.model,
        reasoning: { effort: "low" },
        instructions: NAMI_CHAT_INSTRUCTIONS,
        input: message
      });

      const reply =
        response.output_text?.trim() ||
        "I received that, but I could not produce a useful response.";

      this.logger.log(
        `chat.response conversationId=${conversationId} responseId=${response.id}`
      );

      return {
        reply,
        conversationId,
        actions: []
      };
    } catch (error) {
      const upstreamError = this.createUpstreamError(error);

      this.logger.warn(
        `chat.openai_error conversationId=${conversationId} status=${upstreamError.status} code=${upstreamError.code}`
      );

      throw upstreamError.exception;
    }
  }

  private createUpstreamError(error: unknown) {
    const status = this.readErrorStatus(error);

    if (status === 429) {
      return {
        status,
        code: "OPENAI_QUOTA_EXCEEDED",
        exception: new HttpException(
          {
            code: "OPENAI_QUOTA_EXCEEDED",
            message:
              "OpenAI quota or billing limit was reached for the configured API key.",
            details: { status }
          },
          HttpStatus.TOO_MANY_REQUESTS
        )
      };
    }

    if (status === 401) {
      return {
        status,
        code: "OPENAI_AUTH_FAILED",
        exception: new ServiceUnavailableException({
          code: "OPENAI_AUTH_FAILED",
          message: "OpenAI API authentication failed for the configured key.",
          details: { status }
        })
      };
    }

    return {
      status,
      code: "OPENAI_REQUEST_FAILED",
      exception: new BadGatewayException({
        code: "OPENAI_REQUEST_FAILED",
        message: "Nami could not reach the OpenAI model. Try again in a moment.",
        details: { status }
      })
    };
  }

  private readErrorStatus(error: unknown) {
    if (typeof error === "object" && error !== null && "status" in error) {
      const status = (error as { status?: unknown }).status;

      if (typeof status === "number") {
        return status;
      }
    }

    return 502;
  }
}
