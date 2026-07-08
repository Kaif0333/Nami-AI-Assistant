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
    assert.equal(result.provider, "groq");
    assert.equal(result.text, "Groq is online.");
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

function jsonResponse(payload: unknown) {
  return new Response(JSON.stringify(payload), {
    headers: { "Content-Type": "application/json" },
    status: 200
  });
}
