import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { ActionLogsService } from "../action-logs/action-logs.service";
import type { CreateActionLogInput } from "../action-logs/action-log.types";
import { AiProviderService } from "../ai/ai-provider.service";
import { GenerateTextInput, GenerateTextResult } from "../ai/ai-provider.types";
import { ApprovalsService } from "../approvals/approvals.service";
import { MemoriesService } from "../memories/memories.service";
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

  it("injects relevant active memories into provider instructions", async () => {
    const capturedInputs: GenerateTextInput[] = [];
    const memoriesService = new MemoriesService();
    const activeMemory = await memoriesService.createMemory({
      type: "preference",
      title: "Frontend color palette",
      content:
        "Kaif prefers Citrus Orange #F97316, Soft Citrus #FFEDD5, Pure White #FFFFFF, Off-White #F9FAFB, and Ink Black #111827.",
      tags: ["frontend", "colors"],
      sensitivity: "personal"
    });
    const disabledMemory = await memoriesService.createMemory({
      type: "preference",
      title: "Old frontend palette",
      content: "This disabled memory should not be used.",
      tags: ["frontend", "colors"],
      sensitivity: "personal"
    });
    await memoriesService.disableMemory(disabledMemory.id);
    await memoriesService.createMemory({
      type: "preference",
      title: "Sensitive frontend note",
      content: "This sensitive memory should not be injected automatically.",
      tags: ["frontend", "colors"],
      sensitivity: "sensitive"
    });
    const service = createChatService(
      [
        {
          text: "Use the saved citrus palette.",
          provider: "groq",
          model: "llama-3.1-8b-instant",
          taskProfile: "fast"
        }
      ],
      capturedInputs,
      memoriesService
    );

    const response = await service.sendMessage({
      message: "Which frontend colors should we use?",
      mode: "chat"
    });
    const conversation = await service.getConversation(response.conversationId);
    const assistantMessage = conversation.messages.at(-1);

    assert.match(capturedInputs[0].instructions, /Relevant saved memories/);
    assert.match(capturedInputs[0].instructions, /Citrus Orange #F97316/);
    assert.doesNotMatch(capturedInputs[0].instructions, /disabled memory/);
    assert.doesNotMatch(capturedInputs[0].instructions, /sensitive memory/);
    assert.deepEqual(assistantMessage?.metadata.memoryRecall, {
      count: 1,
      memoryIds: [activeMemory.id]
    });
  });

  it("saves a memory from a natural language chat command without calling AI", async () => {
    const capturedInputs: GenerateTextInput[] = [];
    const capturedLogs: CreateActionLogInput[] = [];
    const memoriesService = new MemoriesService();
    const service = createChatService([], capturedInputs, memoriesService, capturedLogs);

    const response = await service.sendMessage({
      message: "Remember this: Kaif prefers concise weekly planning notes.",
      mode: "chat"
    });
    const memories = await memoriesService.listMemories({
      query: "weekly planning",
      status: "active"
    });

    assert.equal(capturedInputs.length, 0);
    assert.equal(memories.length, 1);
    assert.equal(memories[0].type, "preference");
    assert.equal(response.actions[0].type, "memory_save");
    assert.equal(response.actions[0].status, "completed");
    assert.equal(capturedLogs[0].actionType, "memory_save");
    assert.equal(capturedLogs[0].status, "completed");
  });

  it("answers what Nami remembers from active non-sensitive memories", async () => {
    const capturedInputs: GenerateTextInput[] = [];
    const memoriesService = new MemoriesService();
    await memoriesService.createMemory({
      type: "project",
      title: "Nami roadmap",
      content: "Phase 6 should add web research with citations.",
      tags: ["roadmap", "research"],
      sensitivity: "personal"
    });
    await memoriesService.createMemory({
      type: "project",
      title: "Sensitive roadmap note",
      content: "This sensitive memory should stay hidden from chat search.",
      tags: ["roadmap", "research"],
      sensitivity: "sensitive"
    });
    const service = createChatService([], capturedInputs, memoriesService);

    const response = await service.sendMessage({
      message: "What do you remember about roadmap research?",
      mode: "chat"
    });

    assert.equal(capturedInputs.length, 0);
    assert.match(response.reply, /Nami roadmap/);
    assert.match(response.reply, /web research with citations/);
    assert.doesNotMatch(response.reply, /Sensitive roadmap note/);
  });

  it("disables one matching memory from a forget command", async () => {
    const memoriesService = new MemoriesService();
    const memory = await memoriesService.createMemory({
      type: "preference",
      title: "Meeting style",
      content: "Kaif prefers meetings with a written agenda.",
      tags: ["meetings"],
      sensitivity: "personal"
    });
    const service = createChatService([], [], memoriesService);

    const response = await service.sendMessage({
      message: "Forget memory about written agenda",
      mode: "chat"
    });
    const updated = await memoriesService.getMemory(memory.id);

    assert.equal(updated.status, "disabled");
    assert.equal(response.actions[0].type, "memory_forget");
    assert.equal(response.actions[0].status, "completed");
    assert.match(response.reply, /will not be recalled/);
  });

  it("refuses broad forget commands without changing memories", async () => {
    const memoriesService = new MemoriesService();
    const first = await memoriesService.createMemory({
      type: "general",
      title: "First memory",
      content: "Keep this memory active.",
      sensitivity: "personal"
    });
    const second = await memoriesService.createMemory({
      type: "general",
      title: "Second memory",
      content: "Keep this one active too.",
      sensitivity: "personal"
    });
    const service = createChatService([], [], memoriesService);

    const response = await service.sendMessage({
      message: "Forget all memories",
      mode: "chat"
    });

    assert.equal((await memoriesService.getMemory(first.id)).status, "active");
    assert.equal((await memoriesService.getMemory(second.id)).status, "active");
    assert.equal(response.actions[0].status, "failed");
    assert.match(response.reply, /too broad/);
  });

  it("updates one matching non-sensitive memory from chat", async () => {
    const memoriesService = new MemoriesService();
    const memory = await memoriesService.createMemory({
      type: "preference",
      title: "Frontend palette",
      content: "Kaif prefers the old palette.",
      tags: ["frontend", "palette"],
      sensitivity: "personal"
    });
    const service = createChatService([], [], memoriesService);

    const response = await service.sendMessage({
      message:
        "Update memory about frontend palette to Kaif prefers Citrus Orange and Ink Black.",
      mode: "chat"
    });
    const updated = await memoriesService.getMemory(memory.id);

    assert.equal(
      updated.content,
      "Kaif prefers Citrus Orange and Ink Black."
    );
    assert.equal(response.actions[0].type, "memory_update");
    assert.equal(response.actions[0].status, "completed");
  });

  it("does not save secret-like content from memory commands", async () => {
    const memoriesService = new MemoriesService();
    const service = createChatService([], [], memoriesService);

    const response = await service.sendMessage({
      message: "Remember this: api key: sk-1234567890abcdef",
      mode: "chat"
    });
    const memories = await memoriesService.listMemories({
      status: "active"
    });

    assert.equal(memories.length, 0);
    assert.equal(response.actions[0].status, "failed");
    assert.match(response.reply, /will not store secrets/i);
  });
});

function createChatService(
  responses: GenerateTextResult[],
  capturedInputs: GenerateTextInput[] = [],
  memoriesService?: MemoriesService,
  capturedActionLogs: CreateActionLogInput[] = []
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
    async createActionLog(input: CreateActionLogInput) {
      capturedActionLogs.push(input);
      return undefined;
    }
  } as unknown as ActionLogsService;

  return new ChatService(
    aiProvider,
    policy,
    approvalsService,
    actionLogsService,
    memoriesService
  );
}
