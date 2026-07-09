import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";

import { ConfigService } from "@nestjs/config";

import { AiProviderService } from "./ai-provider.service";
import { AI_PROVIDER_UNAVAILABLE_MESSAGE } from "./ai-provider.types";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("AiProviderService", () => {
  it("uses Groq chat completions when groq is selected", async () => {
    let requestedUrl = "";
    let requestedBody = "";

    globalThis.fetch = async (url, init) => {
      requestedUrl = String(url);
      requestedBody = String(init?.body);

      return jsonResponse({
        choices: [{ message: { content: "Groq is online." } }],
        model: "llama-3.1-8b-instant"
      });
    };

    const service = new AiProviderService(
      configService({
        AI_PROVIDER: "groq",
        GROQ_API_KEY: "test-groq-key",
        GROQ_MODEL: "llama-3.1-8b-instant"
      })
    );

    const result = await service.generateText({
      input: "Hello",
      instructions: "You are Nami."
    });

    assert.equal(
      requestedUrl,
      "https://api.groq.com/openai/v1/chat/completions"
    );
    assert.equal(JSON.parse(requestedBody).model, "llama-3.1-8b-instant");
    assert.equal(JSON.parse(requestedBody).max_tokens, undefined);
    assert.equal(result.provider, "groq");
    assert.equal(result.text, "Groq is online.");
    assert.equal(result.taskProfile, "fast");
  });

  it("routes coding tasks to the dedicated coding model", async () => {
    let requestedBody = "";

    globalThis.fetch = async (_url, init) => {
      requestedBody = String(init?.body);

      return jsonResponse({
        choices: [{ message: { content: "Coding model is online." } }],
        model: "llama-3.3-70b-versatile"
      });
    };

    const service = new AiProviderService(
      configService({
        AI_CODING_MODEL: "llama-3.3-70b-versatile",
        AI_CODING_PROVIDER: "groq",
        AI_PROVIDER: "groq",
        GROQ_API_KEY: "test-groq-key",
        GROQ_MODEL: "llama-3.1-8b-instant"
      })
    );

    const result = await service.generateText({
      input: "Fix this TypeScript error.",
      instructions: "You are Nami.",
      taskProfile: "coding"
    });

    assert.equal(JSON.parse(requestedBody).model, "llama-3.3-70b-versatile");
    assert.equal(result.provider, "groq");
    assert.equal(result.model, "llama-3.3-70b-versatile");
    assert.equal(result.taskProfile, "coding");
  });

  it("uses configured max output tokens only when explicitly set", async () => {
    let requestedBody = "";

    globalThis.fetch = async (_url, init) => {
      requestedBody = String(init?.body);

      return jsonResponse({
        choices: [{ message: { content: "Long coding output is online." } }],
        model: "llama-3.3-70b-versatile"
      });
    };

    const service = new AiProviderService(
      configService({
        AI_CODING_MAX_OUTPUT_TOKENS: "4096",
        AI_CODING_MODEL: "llama-3.3-70b-versatile",
        AI_CODING_PROVIDER: "groq",
        AI_PROVIDER: "groq",
        GROQ_API_KEY: "test-groq-key"
      })
    );

    await service.generateText({
      input: "Build a complete page.",
      instructions: "You are Nami.",
      taskProfile: "coding"
    });

    assert.equal(JSON.parse(requestedBody).max_tokens, 4096);
  });

  it("sends conversation history to chat providers", async () => {
    let requestedBody = "";

    globalThis.fetch = async (_url, init) => {
      requestedBody = String(init?.body);

      return jsonResponse({
        choices: [{ message: { content: "Continuation is online." } }],
        model: "llama-3.1-8b-instant"
      });
    };

    const service = new AiProviderService(
      configService({
        AI_PROVIDER: "groq",
        GROQ_API_KEY: "test-groq-key",
        GROQ_MODEL: "llama-3.1-8b-instant"
      })
    );

    await service.generateText({
      input: "continue",
      instructions: "You are Nami.",
      messages: [
        { role: "user", content: "Write a page." },
        { role: "assistant", content: "Here is the HTML..." },
        { role: "user", content: "continue" }
      ]
    });

    const body = JSON.parse(requestedBody);

    assert.deepEqual(
      body.messages.map((message: { role: string }) => message.role),
      ["system", "user", "assistant", "user"]
    );
    assert.equal(body.messages[2].content, "Here is the HTML...");
  });

  it("falls back when the primary route is unavailable", async () => {
    const requestedUrls: string[] = [];

    globalThis.fetch = async (url) => {
      requestedUrls.push(String(url));

      if (String(url).includes("api.groq.com")) {
        return jsonResponse({ error: "unavailable" }, 503);
      }

      return jsonResponse({
        choices: [{ message: { content: "Fallback is online." } }],
        model: "google/gemini-3.1-flash-lite"
      });
    };

    const service = new AiProviderService(
      configService({
        AI_FAST_FALLBACKS: "openrouter:google/gemini-3.1-flash-lite",
        AI_PROVIDER: "groq",
        GROQ_API_KEY: "test-groq-key",
        GROQ_MODEL: "llama-3.1-8b-instant",
        OPENROUTER_API_KEY: "test-openrouter-key"
      })
    );

    const result = await service.generateText({
      input: "Hello",
      instructions: "You are Nami."
    });

    assert.equal(requestedUrls.length, 2);
    assert.equal(result.provider, "openrouter");
    assert.equal(result.text, "Fallback is online.");
  });

  it("falls back when the primary route stops because of length", async () => {
    const requestedUrls: string[] = [];

    globalThis.fetch = async (url) => {
      requestedUrls.push(String(url));

      if (String(url).includes("api.groq.com")) {
        return jsonResponse({
          choices: [
            {
              finish_reason: "length",
              message: { content: "Partial answer" }
            }
          ],
          model: "llama-3.3-70b-versatile"
        });
      }

      return jsonResponse({
        choices: [
          {
            finish_reason: "stop",
            message: { content: "Complete fallback answer." }
          }
        ],
        model: "google/gemini-3.1-flash-lite"
      });
    };

    const service = new AiProviderService(
      configService({
        AI_CODING_FALLBACKS: "openrouter:google/gemini-3.1-flash-lite",
        AI_CODING_MODEL: "llama-3.3-70b-versatile",
        AI_CODING_PROVIDER: "groq",
        AI_PROVIDER: "groq",
        GROQ_API_KEY: "test-groq-key",
        OPENROUTER_API_KEY: "test-openrouter-key"
      })
    );

    const result = await service.generateText({
      input: "Write a complete landing page.",
      instructions: "You are Nami.",
      taskProfile: "coding"
    });

    assert.equal(requestedUrls.length, 2);
    assert.equal(result.provider, "openrouter");
    assert.equal(result.text, "Complete fallback answer.");
    assert.equal(result.wasTruncated, false);
  });

  it("uses OpenRouter chat completions when openrouter is selected", async () => {
    let requestedUrl = "";
    let requestedBody = "";

    globalThis.fetch = async (url, init) => {
      requestedUrl = String(url);
      requestedBody = String(init?.body);

      return jsonResponse({
        choices: [{ message: { content: "OpenRouter is online." } }],
        model: "google/gemini-3.1-flash-lite"
      });
    };

    const service = new AiProviderService(
      configService({
        AI_PROVIDER: "openrouter",
        APP_NAME: "Nami AI Assistant",
        APP_URL: "http://localhost:3000",
        OPENROUTER_API_KEY: "test-openrouter-key",
        OPENROUTER_MODEL: "google/gemini-3.1-flash-lite"
      })
    );

    const result = await service.generateText({
      input: "Hello",
      instructions: "You are Nami."
    });

    assert.equal(
      requestedUrl,
      "https://openrouter.ai/api/v1/chat/completions"
    );
    assert.equal(JSON.parse(requestedBody).model, "google/gemini-3.1-flash-lite");
    assert.equal(result.provider, "openrouter");
    assert.equal(result.text, "OpenRouter is online.");
  });

  it("uses Gemini generateContent when gemini is selected", async () => {
    let requestedUrl = "";
    let requestedBody = "";

    globalThis.fetch = async (url, init) => {
      requestedUrl = String(url);
      requestedBody = String(init?.body);

      return jsonResponse({
        candidates: [
          {
            content: {
              parts: [{ text: "Gemini is online." }]
            }
          }
        ]
      });
    };

    const service = new AiProviderService(
      configService({
        AI_PROVIDER: "gemini",
        GEMINI_API_KEY: "test-gemini-key",
        GEMINI_MODEL: "gemini-2.0-flash-lite"
      })
    );

    const result = await service.generateText({
      input: "Hello",
      instructions: "You are Nami."
    });

    assert.match(
      requestedUrl,
      /^https:\/\/generativelanguage\.googleapis\.com\/v1beta\/models\/gemini-2\.0-flash-lite:generateContent\?key=/
    );
    assert.equal(
      JSON.parse(requestedBody).contents[0].parts[0].text,
      "Hello"
    );
    assert.equal(result.provider, "gemini");
    assert.equal(result.text, "Gemini is online.");
  });

  it("does not fake unsupported future OpenAI responses", async () => {
    const service = new AiProviderService(
      configService({
        AI_PROVIDER: "openai",
        OPENAI_API_KEY: "future-test-key",
        OPENAI_MODEL: "future-model"
      })
    );

    await assert.rejects(
      () =>
        service.generateText({
          input: "Hello",
          instructions: "You are Nami."
        }),
      new RegExp(AI_PROVIDER_UNAVAILABLE_MESSAGE)
    );
  });
});

function configService(values: Record<string, string>) {
  return {
    get(key: string) {
      return values[key];
    }
  } as ConfigService;
}

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    headers: { "Content-Type": "application/json" },
    status
  });
}
