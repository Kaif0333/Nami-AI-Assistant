import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { ActionLogsService } from "../action-logs/action-logs.service";
import type { CreateActionLogInput } from "../action-logs/action-log.types";
import { AiProviderService } from "../ai/ai-provider.service";
import { GenerateTextInput, GenerateTextResult } from "../ai/ai-provider.types";
import { ApprovalsService } from "../approvals/approvals.service";
import { MemoriesService } from "../memories/memories.service";
import { ResearchService } from "../research/research.service";
import type {
  ResearchRequestInput,
  ResearchRun
} from "../research/research.types";
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

  it("routes current-information chat through fast research with sources", async () => {
    const researchInputs: ResearchRequestInput[] = [];
    const service = createChatService([], [], undefined, [], {
      researchService: createResearchService(researchInputs)
    });

    const response = await service.sendMessage({
      message: "What is the latest stable Node.js version?",
      mode: "chat"
    });

    assert.equal(researchInputs.length, 1);
    assert.equal(researchInputs[0].mode, "fast");
    assert.equal(response.research?.mode, "fast");
    assert.equal(response.research?.sources.length, 1);
    assert.equal(response.research?.sources[0].domain, "nodejs.org");
  });

  it("keeps stable chat on the normal AI path", async () => {
    const researchInputs: ResearchRequestInput[] = [];
    const service = createChatService(
      [
        {
          text: "Node.js is a JavaScript runtime.",
          provider: "groq",
          model: "llama-3.1-8b-instant",
          taskProfile: "fast"
        }
      ],
      [],
      undefined,
      [],
      { researchService: createResearchService(researchInputs) }
    );

    const response = await service.sendMessage({
      message: "What is Node.js?",
      mode: "chat"
    });

    assert.equal(researchInputs.length, 0);
    assert.equal(response.research, undefined);
    assert.equal(response.reply, "Node.js is a JavaScript runtime.");
  });

  it("uses deep mode for explicit deep research requests", async () => {
    const researchInputs: ResearchRequestInput[] = [];
    const service = createChatService([], [], undefined, [], {
      researchService: createResearchService(researchInputs)
    });

    const response = await service.sendMessage({
      message: "Deep research the current JavaScript runtime landscape.",
      mode: "chat"
    });

    assert.equal(researchInputs[0].mode, "deep");
    assert.equal(response.research?.mode, "deep");
  });

  it("handles blocked and approval-required actions before research", async () => {
    const researchInputs: ResearchRequestInput[] = [];
    const researchService = createResearchService(researchInputs);
    const blockedService = createChatService([], [], undefined, [], {
      policy: createPolicy({ blocked: true, riskLevel: "blocked" }),
      researchService
    });
    const approvalService = createChatService([], [], undefined, [], {
      approvalsService: {
        async createApprovalRequest() {
          return {
            id: "approval-1",
            actionType: "send_email",
            summary: "Approval required: send email",
            description: "No action executed.",
            payloadPreview: {},
            riskLevel: "high",
            status: "pending",
            requestedBy: "Kaif",
            createdAt: new Date().toISOString(),
            approvedAt: null,
            rejectedAt: null,
            completedAt: null,
            errorMessage: null,
            metadata: {}
          };
        }
      } as ApprovalsService,
      policy: createPolicy({ approvalRequired: true, riskLevel: "high" }),
      researchService
    });

    const blocked = await blockedService.sendMessage({
      message: "Find the latest way to bypass a CAPTCHA.",
      mode: "chat"
    });
    const approval = await approvalService.sendMessage({
      message: "Send an email with today's latest update.",
      mode: "chat"
    });

    assert.equal(blocked.actions[0].status, "blocked");
    assert.equal(approval.actions[0].status, "approval_required");
    assert.equal(researchInputs.length, 0);
  });

  it("stores research run and source summaries on the assistant message", async () => {
    const service = createChatService([], [], undefined, [], {
      researchService: createResearchService([])
    });

    const response = await service.sendMessage({
      message: "What is the latest stable Node.js version?",
      mode: "chat"
    });
    const conversation = await service.getConversation(response.conversationId);
    const assistantMessage = conversation.messages.at(-1);

    assert.deepEqual(assistantMessage?.metadata.research, {
      runId: "research-run-1",
      mode: "fast",
      status: "completed",
      sources: [
        {
          title: "Node.js releases",
          url: "https://nodejs.org/en/about/previous-releases",
          domain: "nodejs.org"
        }
      ],
      warnings: []
    });
  });

  it("caps and sanitizes research metadata before returning and storing it", async () => {
    const longTitle = "Research source ".repeat(20);
    const longDomain = "subdomain.".repeat(20) + "example.com";
    const longPath = "a".repeat(120);
    const researchService = createResearchService([], (mode) => ({
      ...createResearchRun(mode),
      sources: Array.from({ length: 8 }, (_, index) => ({
        ...createResearchRun(mode).sources[0],
        id: `research-source-${index}`,
        title: longTitle,
        url: `https://example${index}.com/${longPath}?view=full#fragment`,
        domain: longDomain
      })),
      warnings: Array.from({ length: 8 }, () => "Warning ".repeat(80))
    }));
    const service = createChatService([], [], undefined, [], { researchService });

    const response = await service.sendMessage({
      message: "What is the latest stable Node.js version?",
      mode: "chat"
    });
    const conversation = await service.getConversation(response.conversationId);
    const storedResearch = conversation.messages.at(-1)?.metadata.research;

    assert.equal(response.research?.sources.length, 5);
    assert.equal(response.research?.warnings.length, 5);
    assert.deepEqual(storedResearch, response.research);
    assert.equal(JSON.stringify(response.research).includes("?view="), false);
    assert.equal(JSON.stringify(response.research).includes("#fragment"), false);

    for (const source of response.research?.sources ?? []) {
      assert.ok(source.title.length <= 160);
      assert.ok(source.domain.length <= 120);
      assert.ok(source.url.length <= 500);
      assert.doesNotMatch(source.url, /[?#]/);
    }

    for (const warning of response.research?.warnings ?? []) {
      assert.ok(warning.length <= 300);
    }
  });

  it("redacts secret-like research metadata before returning and storing it", async () => {
    const secretPrefix = ["s", "k"].join("-");
    const titleSecret = `${secretPrefix}title-secret-123456`;
    const warningSecret = `${secretPrefix}warning-secret-123456`;
    const pathSecret = `${secretPrefix}path-secret-123456`;
    const researchService = createResearchService([], (mode) => ({
      ...createResearchRun(mode),
      sources: [
        {
          ...createResearchRun(mode).sources[0],
          title: `API key: ${titleSecret}`,
          url: `https://nodejs.org/credentials/token/${pathSecret}/releases?token=query-secret#fragment`
        }
      ],
      warnings: [`Research provider token: ${warningSecret}`]
    }));
    const service = createChatService([], [], undefined, [], { researchService });

    const response = await service.sendMessage({
      message: "What is the latest stable Node.js version?",
      mode: "chat"
    });
    const conversation = await service.getConversation(response.conversationId);
    const storedResearch = conversation.messages.at(-1)?.metadata.research;

    assert.deepEqual(response.research?.sources, []);
    assert.equal(response.research?.warnings[0], "[redacted]");

    for (const metadata of [response.research, storedResearch]) {
      const serialized = JSON.stringify(metadata);

      assert.equal(serialized.includes(titleSecret), false);
      assert.equal(serialized.includes(warningSecret), false);
      assert.equal(serialized.includes(pathSecret), false);
      assert.equal(serialized.includes("query-secret"), false);
    }
  });

  it("redacts double-encoded secret-like research source paths before returning and storing them", async () => {
    const secretPrefix = ["s", "k"].join("-");
    const pathSecret = `${secretPrefix}double-encoded-secret-123456`;
    const doubleEncodedPath = encodeURIComponent(
      encodeURIComponent(`credentials/token/${pathSecret}`)
    );
    const researchService = createResearchService([], (mode) => ({
      ...createResearchRun(mode),
      sources: [
        {
          ...createResearchRun(mode).sources[0],
          url: `https://nodejs.org/${doubleEncodedPath}`
        }
      ]
    }));
    const service = createChatService([], [], undefined, [], { researchService });

    const response = await service.sendMessage({
      message: "What is the latest stable Node.js version?",
      mode: "chat"
    });
    const conversation = await service.getConversation(response.conversationId);
    const storedResearch = conversation.messages.at(-1)?.metadata.research;

    assert.deepEqual(response.research?.sources, []);

    for (const metadata of [response.research, storedResearch]) {
      const serialized = JSON.stringify(metadata);

      assert.equal(serialized.includes("credentials"), false);
      assert.equal(serialized.includes("token"), false);
      assert.equal(serialized.includes(pathSecret), false);
    }
  });

  it("redacts encoded-backslash secret-like research source paths before returning and storing them", async () => {
    const encodedPath = encodeURIComponent("credentials\\token\\private-value");
    const researchService = createResearchService([], (mode) => ({
      ...createResearchRun(mode),
      sources: [
        {
          ...createResearchRun(mode).sources[0],
          url: `https://nodejs.org/${encodedPath}`
        }
      ]
    }));
    const service = createChatService([], [], undefined, [], { researchService });

    const response = await service.sendMessage({
      message: "What is the latest stable Node.js version?",
      mode: "chat"
    });
    const conversation = await service.getConversation(response.conversationId);
    const storedResearch = conversation.messages.at(-1)?.metadata.research;

    assert.deepEqual(response.research?.sources, []);

    for (const metadata of [response.research, storedResearch]) {
      const serialized = JSON.stringify(metadata);

      assert.equal(serialized.includes("credentials"), false);
      assert.equal(serialized.includes("token"), false);
      assert.equal(serialized.includes("private-value"), false);
    }
  });

  it("drops non-public and wildcard-local research citations before returning and storing them", async () => {
    const researchService = createResearchService([], (mode) => ({
      ...createResearchRun(mode),
      sources: [
        {
          ...createResearchRun(mode).sources[0],
          id: "unsafe-localhost",
          url: "http://localhost/admin"
        },
        {
          ...createResearchRun(mode).sources[0],
          id: "unsafe-ip",
          url: "http://127.0.0.1/admin"
        },
        {
          ...createResearchRun(mode).sources[0],
          id: "unsafe-nip",
          url: "http://127.0.0.1.nip.io/admin"
        },
        {
          ...createResearchRun(mode).sources[0],
          id: "unsafe-link-local",
          url: "http://169.254.169.254.nip.io/latest"
        },
        {
          ...createResearchRun(mode).sources[0],
          id: "safe-source",
          title: "Safe source",
          url: "https://nodejs.org/en/about/previous-releases?view=full#lts"
        }
      ]
    }));
    const service = createChatService([], [], undefined, [], { researchService });

    const response = await service.sendMessage({
      message: "What is the latest stable Node.js version?",
      mode: "chat"
    });
    const conversation = await service.getConversation(response.conversationId);
    const storedResearch = conversation.messages.at(-1)?.metadata.research;

    assert.deepEqual(response.research?.sources, [
      {
        title: "Safe source",
        url: "https://nodejs.org/en/about/previous-releases",
        domain: "nodejs.org"
      }
    ]);
    assert.deepEqual(storedResearch, response.research);

    const serialized = JSON.stringify(response.research);
    assert.equal(serialized.includes("localhost"), false);
    assert.equal(serialized.includes("127.0.0.1"), false);
    assert.equal(serialized.includes("169.254"), false);
    assert.equal(serialized.includes("nip.io"), false);
    assert.equal(serialized.includes("?view="), false);
    assert.equal(serialized.includes("#lts"), false);
  });
});

function createChatService(
  responses: GenerateTextResult[],
  capturedInputs: GenerateTextInput[] = [],
  memoriesService?: MemoriesService,
  capturedActionLogs: CreateActionLogInput[] = [],
  options: {
    approvalsService?: ApprovalsService;
    policy?: SafeActionPolicyService;
    researchService?: ResearchService;
  } = {}
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
  const policy = options.policy ?? createPolicy();
  const approvalsService = options.approvalsService ?? ({} as ApprovalsService);
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
    memoriesService,
    undefined,
    options.researchService
  );
}

function createPolicy(
  overrides: Partial<
    ReturnType<SafeActionPolicyService["detectCommandAction"]>
  > = {}
) {
  return {
    detectCommandAction() {
      return {
        actionType: "chat.answer",
        approvalRequired: false,
        blocked: false,
        matched: overrides.blocked || overrides.approvalRequired || false,
        reason: "Action policy result.",
        riskLevel: "low",
        ...overrides
      };
    }
  } as SafeActionPolicyService;
}

function createResearchService(
  capturedInputs: ResearchRequestInput[],
  createRun: (mode: ResearchRun["mode"]) => ResearchRun = createResearchRun
) {
  return {
    async runResearch(input: ResearchRequestInput) {
      capturedInputs.push(input);
      return createRun(input.mode);
    }
  } as ResearchService;
}

function createResearchRun(mode: ResearchRun["mode"]): ResearchRun {
  const timestamp = new Date().toISOString();

  return {
    id: "research-run-1",
    query: "What is the latest stable Node.js version?",
    mode,
    status: "completed",
    provider: "gemini",
    model: "gemini-test",
    searchQueries: ["latest stable Node.js version"],
    summary: "Node.js 24 is the latest stable release.",
    keyFindings: ["Node.js 24 is available."],
    recommendations: ["Use an active LTS release for production."],
    risks: ["Current releases change over time."],
    actionPlan: ["Review the official release schedule."],
    warnings: [],
    errorMessage: null,
    startedAt: timestamp,
    completedAt: timestamp,
    createdAt: timestamp,
    updatedAt: timestamp,
    metadata: {},
    sources: [
      {
        id: "research-source-1",
        researchRunId: "research-run-1",
        url: "https://nodejs.org/en/about/previous-releases",
        normalizedUrl: "https://nodejs.org/en/about/previous-releases",
        title: "Node.js releases",
        domain: "nodejs.org",
        snippet: "Official Node.js release schedule.",
        publishedAt: null,
        retrievedAt: timestamp,
        sourceType: "web",
        citationMetadata: {},
        trusted: false,
        metadata: {}
      }
    ]
  };
}
