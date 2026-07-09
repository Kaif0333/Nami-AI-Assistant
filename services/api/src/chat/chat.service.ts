import { BadRequestException, Inject, Injectable, Logger } from "@nestjs/common";
import { randomUUID } from "node:crypto";

import { ActionLogsService } from "../action-logs/action-logs.service";
import { AiProviderService } from "../ai/ai-provider.service";
import { AiChatMessage, AiTaskProfile } from "../ai/ai-provider.types";
import { classifyAiTaskProfile } from "../ai/model-router";
import { ApprovalsService } from "../approvals/approvals.service";
import { SafeActionPolicyService } from "../safety/safe-action-policy.service";
import { ChatResponseData } from "./chat.types";
import { ChatRequestDto } from "./dto/chat-request.dto";
import { NAMI_CHAT_INSTRUCTIONS } from "./nami-chat.prompt";

const maxConversationMessages = 16;
const maxConversationCharacters = 12000;
const maxAutoContinuationSteps = 6;

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);
  private readonly conversations = new Map<string, AiChatMessage[]>();
  private readonly conversationTaskProfiles = new Map<string, AiTaskProfile>();

  constructor(
    @Inject(AiProviderService)
    private readonly aiProvider: AiProviderService,
    @Inject(SafeActionPolicyService)
    private readonly policy: SafeActionPolicyService,
    @Inject(ApprovalsService)
    private readonly approvalsService: ApprovalsService,
    @Inject(ActionLogsService)
    private readonly actionLogsService: ActionLogsService
  ) {}

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

      this.recordConversationTurn(conversationId, message, reply);

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

      this.recordConversationTurn(conversationId, message, reply);

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
    const taskProfile =
      isContinuation && this.conversationTaskProfiles.has(conversationId)
        ? this.conversationTaskProfiles.get(conversationId)!
        : classifyAiTaskProfile(message);
    const providerMessage = this.buildProviderMessage(message, isContinuation);
    const messages = [
      ...this.getConversationHistory(conversationId),
      { role: "user" as const, content: providerMessage }
    ];
    const response = await this.generateCompleteResponse({
      messages,
      providerMessage,
      taskProfile
    });

    this.recordConversationTurn(conversationId, message, response.text);
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

  private getConversationHistory(conversationId: string) {
    return this.conversations.get(conversationId) ?? [];
  }

  private recordConversationTurn(
    conversationId: string,
    userContent: string,
    assistantContent: string
  ) {
    const history = [
      ...this.getConversationHistory(conversationId),
      { role: "user" as const, content: userContent },
      { role: "assistant" as const, content: assistantContent }
    ];

    this.conversations.set(conversationId, this.pruneConversationHistory(history));
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
}
