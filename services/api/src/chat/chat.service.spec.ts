import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { ActionLogsService } from "../action-logs/action-logs.service";
import { AiProviderService } from "../ai/ai-provider.service";
import { GenerateTextInput, GenerateTextResult } from "../ai/ai-provider.types";
import { ApprovalsService } from "../approvals/approvals.service";
import { SafeActionPolicyService } from "../safety/safe-action-policy.service";
import { ChatService } from "./chat.service";

describe("ChatService conversation history", () => {
  it("stores user and assistant messages in the fallback conversation store", async () => {
    const service = createChatService([
      {
        text: "Hello Kaif.",
        provider: "groq",
        model: "llama-3.1-8b-instant",
        taskProfile: "fast"
      }
    ]);

    const response = await service.sendMessage({
      message: "Hello Nami",
      mode: "chat"
    });
    const conversations = await service.listConversations();
    const conversation = await service.getConversation(response.conversationId);

    assert.equal(conversations.length, 1);
    assert.equal(conversations[0].messageCount, 2);
    assert.equal(conversations[0].title, "Hello Nami");
    assert.equal(conversation.messages.length, 2);
    assert.equal(conversation.messages[0].role, "user");
    assert.equal(conversation.messages[0].content, "Hello Nami");
    assert.equal(conversation.messages[1].role, "assistant");
    assert.equal(conversation.messages[1].content, "Hello Kaif.");
    assert.equal(conversation.messages[1].metadata.taskProfile, "fast");
    assert.equal(conversation.messages[1].metadata.provider, "groq");
    assert.equal(conversation.messages[1].metadata.model, "llama-3.1-8b-instant");
  });

  it("passes prior conversation history into continuation requests", async () => {
    const capturedInputs: GenerateTextInput[] = [];
    const service = createChatService(
      [
        {
          text: "Start of the answer.",
          provider: "groq",
          model: "llama-3.3-70b-versatile",
          taskProfile: "coding"
        },
        {
          text: "Continuation of the answer.",
          provider: "groq",
          model: "llama-3.3-70b-versatile",
          taskProfile: "coding"
        }
      ],
      capturedInputs
    );

    const first = await service.sendMessage({
      message: "Write code for a landing page",
      mode: "chat"
    });
    await service.sendMessage({
      conversationId: first.conversationId,
      message: "continue",
      mode: "chat"
    });

    assert.equal(capturedInputs.length, 2);
    assert.equal(capturedInputs[1].taskProfile, "coding");
    assert.deepEqual(
      capturedInputs[1].messages?.map((message) => message.role),
      ["user", "assistant", "user"]
    );
    assert.equal(capturedInputs[1].messages?.[1].content, "Start of the answer.");
  });
});

function createChatService(
  responses: GenerateTextResult[],
  capturedInputs: GenerateTextInput[] = []
) {
  let responseIndex = 0;

  const aiProvider = {
    async generateText(input: GenerateTextInput) {
      capturedInputs.push(input);
      const response = responses[Math.min(responseIndex, responses.length - 1)];
      responseIndex += 1;
      return response;
    }
  } as AiProviderService;
  const policy = {
    detectCommandAction() {
      return {
        actionType: "chat.answer",
        approvalRequired: false,
        blocked: false,
        matched: false,
        reason: "Action is allowed without approval.",
        riskLevel: "low"
      };
    }
  } as SafeActionPolicyService;
  const approvalsService = {} as ApprovalsService;
  const actionLogsService = {
    async createActionLog() {
      return undefined;
    }
  } as unknown as ActionLogsService;

  return new ChatService(
    aiProvider,
    policy,
    approvalsService,
    actionLogsService
  );
}
