import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  Optional
} from "@nestjs/common";
import type { Conversation, Message, Prisma } from "@prisma/client";
import { randomUUID } from "node:crypto";

import { ActionLogsService } from "../action-logs/action-logs.service";
import { AiProviderService } from "../ai/ai-provider.service";
import {
  AiChatMessage,
  AiTaskProfile,
  aiTaskProfiles
} from "../ai/ai-provider.types";
import { classifyAiTaskProfile } from "../ai/model-router";
import { ApprovalsService } from "../approvals/approvals.service";
import { DatabaseService } from "../database/database.service";
import { SafeActionPolicyService } from "../safety/safe-action-policy.service";
import {
  ChatConversationDetail,
  ChatConversationSummary,
  ChatMessageRecord,
  ChatResponseData,
  StoredChatRole
} from "./chat.types";
import { ChatRequestDto } from "./dto/chat-request.dto";
import { NAMI_CHAT_INSTRUCTIONS } from "./nami-chat.prompt";

const maxConversationMessages = 16;
const maxConversationCharacters = 12000;
const maxAutoContinuationSteps = 6;

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);
  private readonly conversations = new Map<string, AiChatMessage[]>();
  private readonly conversationDetails = new Map<string, ChatConversationDetail>();
  private readonly conversationTaskProfiles = new Map<string, AiTaskProfile>();

  constructor(
    @Inject(AiProviderService)
    private readonly aiProvider: AiProviderService,
    @Inject(SafeActionPolicyService)
    private readonly policy: SafeActionPolicyService,
    @Inject(ApprovalsService)
    private readonly approvalsService: ApprovalsService,
    @Inject(ActionLogsService)
    private readonly actionLogsService: ActionLogsService,
    @Optional()
    @Inject(DatabaseService)
    private readonly database?: DatabaseService
  ) {}

  async sendMessage(input: ChatRequestDto): Promise<ChatResponseData> {
    const message = input.message.trim();
    const conversationId = this.resolveConversationId(input.conversationId);

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

    const detectedAction = this.policy.detectCommandAction(message);

    if (detectedAction.matched && detectedAction.blocked) {
      await this.actionLogsService.createActionLog({
        commandId: conversationId,
        actionType: detectedAction.actionType,
        summary: "Blocked chat-requested action",
        status: "blocked",
        riskLevel: "blocked",
        inputPreview: { command: message },
        errorMessage: detectedAction.reason,
        metadata: {
          source: "chat",
          realExternalAction: false
        }
      });

      const reply =
        "This action is blocked by Nami's safety policy and was not executed.";

      await this.recordConversationTurn(conversationId, message, reply);

      return {
        reply,
        conversationId,
        actions: [
          {
            type: detectedAction.actionType,
            status: "blocked",
            summary: detectedAction.reason
          }
        ]
      };
    }

    if (detectedAction.matched && detectedAction.approvalRequired) {
      const approval = await this.approvalsService.createApprovalRequest({
        actionType: detectedAction.actionType,
        summary: `Approval required: ${detectedAction.actionType.replaceAll("_", " ")}`,
        description:
          "Chat requested a risky action. No external action has been executed.",
        payloadPreview: { command: message },
        riskLevel: detectedAction.riskLevel,
        requestedBy: "Kaif",
        metadata: {
          source: "chat",
          conversationId,
          realExternalAction: false
        }
      });

      await this.actionLogsService.createActionLog({
        commandId: conversationId,
        approvalId: approval.id,
        actionType: approval.actionType,
        summary: approval.summary,
        status: "approval_required",
        riskLevel: approval.riskLevel,
        inputPreview: approval.payloadPreview,
        metadata: {
          source: "chat",
          realExternalAction: false
        }
      });

      const reply =
        "Approval request created. Review it in Approvals before any action can run.";

      await this.recordConversationTurn(conversationId, message, reply);

      return {
        reply,
        conversationId,
        actions: [
          {
            type: approval.actionType,
            status: "approval_required",
            summary: approval.summary,
            approvalId: approval.id
          }
        ]
      };
    }

    const isContinuation = this.isContinuationRequest(message);
    const taskProfile = await this.resolveTaskProfile(
      conversationId,
      message,
      isContinuation
    );
    const providerMessage = this.buildProviderMessage(message, isContinuation);
    const messages = [
      ...(await this.getConversationHistory(conversationId)),
      { role: "user" as const, content: providerMessage }
    ];
    const response = await this.generateCompleteResponse({
      messages,
      providerMessage,
      taskProfile
    });

    await this.recordConversationTurn(conversationId, message, response.text, {
      finishReason: response.finishReason,
      model: response.model,
      provider: response.provider,
      taskProfile: response.taskProfile,
      wasTruncated: response.wasTruncated
    });
    this.conversationTaskProfiles.set(conversationId, response.taskProfile);

    this.logger.log(
      `chat.response conversationId=${conversationId} taskProfile=${response.taskProfile} provider=${response.provider} model=${response.model}`
    );

    return {
      reply: response.text,
      conversationId,
      actions: [],
      finishReason: response.finishReason,
      modelRoute: {
        taskProfile: response.taskProfile,
        provider: response.provider,
        model: response.model
      },
      wasTruncated: response.wasTruncated
    };
  }

  async listConversations(): Promise<ChatConversationSummary[]> {
    if (this.database?.client) {
      const conversations = await this.database.client.conversation.findMany({
        include: {
          _count: { select: { messages: true } },
          messages: {
            orderBy: { createdAt: "desc" },
            take: 1
          }
        },
        orderBy: { updatedAt: "desc" },
        take: 50
      });

      return conversations.map((conversation) =>
        this.toConversationSummary(conversation)
      );
    }

    return Array.from(this.conversationDetails.values())
      .map((conversation) => this.toInMemorySummary(conversation))
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  }

  async getConversation(conversationId: string): Promise<ChatConversationDetail> {
    if (this.database?.client) {
      const conversation = await this.database.client.conversation.findUnique({
        where: { id: conversationId },
        include: {
          _count: { select: { messages: true } },
          messages: { orderBy: { createdAt: "asc" } }
        }
      });

      if (!conversation) {
        throw this.notFound(conversationId);
      }

      return this.toConversationDetail(conversation);
    }

    const conversation = this.conversationDetails.get(conversationId);

    if (!conversation) {
      throw this.notFound(conversationId);
    }

    return conversation;
  }

  private async getConversationHistory(conversationId: string) {
    if (this.database?.client) {
      const messages = await this.database.client.message.findMany({
        orderBy: { createdAt: "desc" },
        select: { content: true, role: true },
        take: maxConversationMessages,
        where: { conversationId }
      });

      return this.pruneConversationHistory(
        messages
          .reverse()
          .filter((message) => isStoredChatRole(message.role))
          .map((message) => ({
            role: message.role as StoredChatRole,
            content: message.content
          }))
      );
    }

    return this.conversations.get(conversationId) ?? [];
  }

  private async recordConversationTurn(
    conversationId: string,
    userContent: string,
    assistantContent: string,
    assistantMetadata: Record<string, unknown> = {}
  ) {
    const now = new Date();
    const userMessage: ChatMessageRecord = {
      id: randomUUID(),
      conversationId,
      role: "user",
      content: userContent,
      createdAt: now.toISOString(),
      metadata: {}
    };
    const assistantMessage: ChatMessageRecord = {
      id: randomUUID(),
      conversationId,
      role: "assistant",
      content: assistantContent,
      createdAt: new Date(now.getTime() + 1).toISOString(),
      metadata: compactMetadata(assistantMetadata)
    };
    const currentHistory = await this.getConversationHistory(conversationId);
    const history = [
      ...currentHistory,
      { role: "user" as const, content: userContent },
      { role: "assistant" as const, content: assistantContent }
    ];

    this.conversations.set(conversationId, this.pruneConversationHistory(history));

    if (this.database?.client) {
      await this.database.client.$transaction(async (prisma) => {
        await prisma.conversation.upsert({
          create: {
            id: conversationId,
            title: createConversationTitle(userContent),
            metadata: {
              persistence: "database",
              source: "chat"
            },
            createdAt: now,
            updatedAt: now
          },
          update: {
            updatedAt: now
          },
          where: { id: conversationId }
        });

        await prisma.message.createMany({
          data: [
            this.toMessageCreateInput(userMessage),
            this.toMessageCreateInput(assistantMessage)
          ]
        });
      });

      return;
    }

    this.recordInMemoryConversation(conversationId, userMessage, assistantMessage);
  }

  private pruneConversationHistory(messages: AiChatMessage[]) {
    const recentMessages = messages.slice(-maxConversationMessages);
    const kept: AiChatMessage[] = [];
    let characterCount = 0;

    for (const message of [...recentMessages].reverse()) {
      characterCount += message.content.length;

      if (characterCount > maxConversationCharacters) {
        break;
      }

      kept.unshift(message);
    }

    return kept;
  }

  private isContinuationRequest(message: string) {
    return /^(continue|continue please|go on|keep going|finish it|complete it|continue from where you stopped|continue from where it stopped)$/i.test(
      message.trim()
    );
  }

  private buildProviderMessage(message: string, isContinuation: boolean) {
    if (!isContinuation) {
      return message;
    }

    return [
      "Continue the previous assistant response from exactly where it stopped.",
      "Do not restart the answer unless necessary.",
      "If the previous response was code, continue the same file/code block and close any unfinished blocks.",
      `User message: ${message}`
    ].join("\n");
  }

  private async resolveTaskProfile(
    conversationId: string,
    message: string,
    isContinuation: boolean
  ) {
    if (!isContinuation) {
      return classifyAiTaskProfile(message);
    }

    const cachedTaskProfile = this.conversationTaskProfiles.get(conversationId);

    if (cachedTaskProfile) {
      return cachedTaskProfile;
    }

    const storedTaskProfile =
      await this.getStoredConversationTaskProfile(conversationId);

    if (storedTaskProfile) {
      this.conversationTaskProfiles.set(conversationId, storedTaskProfile);
      return storedTaskProfile;
    }

    return classifyAiTaskProfile(message);
  }

  private async getStoredConversationTaskProfile(
    conversationId: string
  ): Promise<AiTaskProfile | undefined> {
    if (this.database?.client) {
      const message = await this.database.client.message.findFirst({
        orderBy: { createdAt: "desc" },
        select: { metadata: true },
        where: { conversationId, role: "assistant" }
      });
      const metadata = asRecord(message?.metadata);

      return isAiTaskProfile(metadata.taskProfile)
        ? metadata.taskProfile
        : undefined;
    }

    const conversation = this.conversationDetails.get(conversationId);
    const latestAssistantMessage = [...(conversation?.messages ?? [])]
      .reverse()
      .find((message) => message.role === "assistant");
    const metadata = asRecord(latestAssistantMessage?.metadata);

    return isAiTaskProfile(metadata.taskProfile)
      ? metadata.taskProfile
      : undefined;
  }

  private async generateCompleteResponse(input: {
    messages: AiChatMessage[];
    providerMessage: string;
    taskProfile: AiTaskProfile;
  }) {
    let messages = input.messages;
    let response = await this.aiProvider.generateText({
      instructions: NAMI_CHAT_INSTRUCTIONS,
      input: input.providerMessage,
      messages,
      taskProfile: input.taskProfile
    });
    let combinedText = response.text;
    let continuationCount = 0;

    while (response.wasTruncated && continuationCount < maxAutoContinuationSteps) {
      continuationCount += 1;
      const continuationMessage = this.buildProviderMessage("continue", true);

      messages = [
        ...messages,
        { role: "assistant", content: response.text },
        { role: "user", content: continuationMessage }
      ];
      response = await this.aiProvider.generateText({
        instructions: NAMI_CHAT_INSTRUCTIONS,
        input: continuationMessage,
        messages,
        taskProfile: input.taskProfile
      });
      combinedText = `${combinedText}\n\n${response.text}`;
    }

    return {
      ...response,
      text: combinedText,
      wasTruncated: response.wasTruncated
    };
  }

  private resolveConversationId(conversationId?: string) {
    const trimmed = conversationId?.trim();

    return trimmed && isUuid(trimmed) ? trimmed : randomUUID();
  }

  private toMessageCreateInput(message: ChatMessageRecord) {
    return {
      id: message.id,
      conversationId: message.conversationId,
      role: message.role,
      content: message.content,
      createdAt: new Date(message.createdAt),
      metadata: message.metadata as Prisma.InputJsonObject
    };
  }

  private recordInMemoryConversation(
    conversationId: string,
    userMessage: ChatMessageRecord,
    assistantMessage: ChatMessageRecord
  ) {
    const current = this.conversationDetails.get(conversationId);
    const now = assistantMessage.createdAt;
    const messages = [...(current?.messages ?? []), userMessage, assistantMessage];
    const conversation: ChatConversationDetail = {
      id: conversationId,
      title: current?.title ?? createConversationTitle(userMessage.content),
      createdAt: current?.createdAt ?? userMessage.createdAt,
      updatedAt: now,
      messageCount: messages.length,
      lastMessagePreview: createPreview(assistantMessage.content),
      metadata: {
        persistence: "in_memory_fallback_no_database_url",
        source: "chat"
      },
      messages
    };

    this.conversationDetails.set(conversationId, conversation);
  }

  private toConversationSummary(
    row: Conversation & {
      _count: { messages: number };
      messages: Message[];
    }
  ): ChatConversationSummary {
    return {
      id: row.id,
      title: row.title,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      messageCount: row._count.messages,
      lastMessagePreview: createPreview(row.messages[0]?.content ?? ""),
      metadata: asRecord(row.metadata)
    };
  }

  private toConversationDetail(
    row: Conversation & {
      _count: { messages: number };
      messages: Message[];
    }
  ): ChatConversationDetail {
    const messages = row.messages.map((message) => this.toMessageRecord(message));

    return {
      id: row.id,
      title: row.title,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      messageCount: row._count.messages,
      lastMessagePreview: createPreview(messages.at(-1)?.content ?? ""),
      metadata: asRecord(row.metadata),
      messages
    };
  }

  private toInMemorySummary(
    conversation: ChatConversationDetail
  ): ChatConversationSummary {
    const { messages: _messages, ...summary } = conversation;

    return summary;
  }

  private toMessageRecord(row: Message): ChatMessageRecord {
    return {
      id: row.id,
      conversationId: row.conversationId,
      role: isStoredChatRole(row.role) ? row.role : "assistant",
      content: row.content,
      createdAt: row.createdAt.toISOString(),
      metadata: asRecord(row.metadata)
    };
  }

  private notFound(conversationId: string) {
    return new NotFoundException({
      code: "CHAT_CONVERSATION_NOT_FOUND",
      message: "Chat conversation was not found.",
      details: { conversationId }
    });
  }
}

function createConversationTitle(message: string) {
  const normalized = message.replaceAll(/\s+/g, " ").trim();

  if (!normalized) {
    return "New conversation";
  }

  return normalized.length > 60 ? `${normalized.slice(0, 57)}...` : normalized;
}

function createPreview(message: string) {
  const normalized = message.replaceAll(/\s+/g, " ").trim();

  return normalized.length > 120 ? `${normalized.slice(0, 117)}...` : normalized;
}

function isStoredChatRole(role: string): role is StoredChatRole {
  return role === "user" || role === "assistant";
}

function isAiTaskProfile(value: unknown): value is AiTaskProfile {
  return (
    typeof value === "string" &&
    aiTaskProfiles.includes(value as AiTaskProfile)
  );
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
}

function compactMetadata(metadata: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(metadata).filter(([, value]) => value !== undefined)
  );
}
