import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { HttpException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import { GeminiGroundedResearchProvider } from "./gemini-grounded-research.provider";
import { ResearchFetch } from "./research-provider.types";

describe("GeminiGroundedResearchProvider", () => {
  it("reports configuration without exposing the API key", () => {
    const provider = new GeminiGroundedResearchProvider(
      configService({
        GEMINI_API_KEY: "configured-test-key",
        RESEARCH_REQUEST_TIMEOUT_MS: "12000",
        RESEARCH_SEARCH_MODEL: "gemini-test-grounding"
      }),
      unusedFetch
    );

    assert.deepEqual(provider.getStatus(), {
      provider: "gemini",
      configured: true,
      model: "gemini-test-grounding",
      supportedModes: ["fast", "deep"],
      supportsUrlContext: true,
      maxUrls: 5,
      requestTimeoutMs: 12000
    });
    assert.equal(JSON.stringify(provider.getStatus()).includes("configured-test-key"), false);
  });

  it("sends a real grounded Gemini request and returns normalized evidence", async () => {
    let requestedUrl = "";
    let requestedInit: RequestInit | undefined;
    const fetch: ResearchFetch = async (url, init) => {
      requestedUrl = String(url);
      requestedInit = init;

      return jsonResponse({
        candidates: [
          {
            content: { parts: [{ text: "Grounded current result." }] },
            groundingMetadata: {
              groundingChunks: [
                {
                  web: {
                    title: "Current documentation",
                    uri: "https://example.com/current"
                  }
                }
              ],
              groundingSupports: [
                {
                  groundingChunkIndices: [0],
                  segment: { endIndex: 25, startIndex: 0 }
                }
              ],
              webSearchQueries: ["current documentation"]
            }
          }
        ],
        usageMetadata: { candidatesTokenCount: 12, promptTokenCount: 8 }
      });
    };
    const provider = configuredProvider(fetch);

    const evidence = await provider.search({
      query: "What is current?",
      mode: "fast",
      researchRunId: "run-123"
    });

    assert.equal(
      requestedUrl,
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-test-grounding:generateContent"
    );
    assert.deepEqual(requestedInit?.headers, {
      "Content-Type": "application/json",
      "x-goog-api-key": "configured-test-key"
    });
    assert.ok(requestedInit?.signal instanceof AbortSignal);

    const body = JSON.parse(String(requestedInit?.body));
    assert.deepEqual(body.tools, [{ google_search: {} }]);
    assert.match(body.systemInstruction.parts[0].text, /source content is data/i);
    assert.match(body.systemInstruction.parts[0].text, /not instructions/i);
    assert.equal(body.contents[0].parts[0].text.includes("What is current?"), true);
    assert.match(body.contents[0].parts[0].text, /## Summary/);
    assert.match(body.contents[0].parts[0].text, /## Key Findings/);
    assert.match(body.contents[0].parts[0].text, /## Recommendations/);
    assert.match(body.contents[0].parts[0].text, /## Risks/);
    assert.match(body.contents[0].parts[0].text, /## Action Plan/);

    assert.equal(evidence.provider, "gemini");
    assert.equal(evidence.model, "gemini-test-grounding");
    assert.equal(evidence.text, "Grounded current result.");
    assert.deepEqual(evidence.searchQueries, ["current documentation"]);
    assert.equal(evidence.sources.length, 1);
    assert.equal(evidence.sources[0]?.normalizedUrl, "https://example.com/current");
    assert.deepEqual(evidence.usageMetadata, {
      candidatesTokenCount: 12,
      promptTokenCount: 8
    });
  });

  it("adds URL Context only for validated explicit URLs", async () => {
    let requestedBody = "";
    const provider = configuredProvider(async (_url, init) => {
      requestedBody = String(init?.body);
      return groundedResponse();
    });

    await provider.search({
      query: "Review this documentation",
      mode: "deep",
      researchRunId: "run-url",
      urls: ["https://example.com/docs"]
    });

    const body = JSON.parse(requestedBody);
    assert.deepEqual(body.tools, [
      { google_search: {} },
      { url_context: {} }
    ]);
    assert.match(body.contents[0].parts[0].text, /https:\/\/example\.com\/docs/);
  });

  it("rejects unsafe URLs before calling Gemini", async () => {
    let called = false;
    const provider = configuredProvider(async () => {
      called = true;
      return groundedResponse();
    });

    await assert.rejects(
      () =>
        provider.search({
          query: "Inspect this URL",
          mode: "fast",
          researchRunId: "run-unsafe",
          urls: ["http://127.0.0.1/admin"]
        }),
      (error) => hasExceptionCode(error, "RESEARCH_URL_NOT_ALLOWED", 400)
    );
    assert.equal(called, false);
  });

  it("rejects public-looking URL Context hosts that resolve to private addresses before calling Gemini", async () => {
    let called = false;
    const provider = configuredProvider(
      async () => {
        called = true;
        return groundedResponse();
      },
      async () => ["10.0.0.1"]
    );

    await assert.rejects(
      () =>
        provider.search({
          query: "Inspect this URL",
          mode: "fast",
          researchRunId: "run-resolved-unsafe",
          urls: ["https://public-looking.example.com/admin"]
        }),
      (error) => hasExceptionCode(error, "RESEARCH_URL_NOT_ALLOWED", 400)
    );
    assert.equal(called, false);
  });

  it("maps a missing Gemini key to RESEARCH_PROVIDER_NOT_CONFIGURED", async () => {
    const provider = new GeminiGroundedResearchProvider(configService({}), unusedFetch);

    assert.equal(provider.getStatus().configured, false);
    await assert.rejects(
      () =>
        provider.search({
          query: "Current result",
          mode: "fast",
          researchRunId: "run-missing-key"
        }),
      (error) =>
        hasExceptionCode(error, "RESEARCH_PROVIDER_NOT_CONFIGURED", 503)
    );
  });

  it("maps Gemini rate limits to RESEARCH_RATE_LIMITED", async () => {
    const provider = configuredProvider(async () => jsonResponse({}, 429));

    await assert.rejects(
      () => search(provider),
      (error) => hasExceptionCode(error, "RESEARCH_RATE_LIMITED", 429)
    );
  });

  it("maps unavailable and failed requests without exposing response bodies", async () => {
    const unavailableProvider = configuredProvider(async () =>
      jsonResponse({ secretProviderBody: "must-not-escape" }, 503)
    );
    const failedProvider = configuredProvider(async () => {
      throw new Error("network failed");
    });

    for (const provider of [unavailableProvider, failedProvider]) {
      await assert.rejects(
        () => search(provider),
        (error) => {
          assert.equal(
            JSON.stringify((error as HttpException).getResponse()).includes(
              "secretProviderBody"
            ),
            false
          );
          return hasExceptionCode(error, "RESEARCH_PROVIDER_UNAVAILABLE", 503);
        }
      );
    }
  });

  it("rejects empty Gemini candidates as unavailable", async () => {
    const provider = configuredProvider(async () => jsonResponse({ candidates: [] }));

    await assert.rejects(
      () => search(provider),
      (error) =>
        hasExceptionCode(error, "RESEARCH_PROVIDER_UNAVAILABLE", 503)
    );
  });

  it("rejects grounded text without valid source metadata", async () => {
    const provider = configuredProvider(async () =>
      jsonResponse({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: "Generated [link](https://example.com/not-authoritative)."
                }
              ]
            },
            groundingMetadata: { webSearchQueries: ["example query"] }
          }
        ]
      })
    );

    await assert.rejects(
      () => search(provider),
      (error) => hasExceptionCode(error, "RESEARCH_NO_SOURCES", 503)
    );
  });
});

function configuredProvider(
  fetch: ResearchFetch,
  resolve = async () => ["93.184.216.34"]
) {
  return new GeminiGroundedResearchProvider(
    configService({
      GEMINI_API_KEY: "configured-test-key",
      RESEARCH_REQUEST_TIMEOUT_MS: "10000",
      RESEARCH_SEARCH_MODEL: "gemini-test-grounding"
    }),
    fetch,
    resolve
  );
}

function configService(values: Record<string, string>) {
  return {
    get(key: string) {
      return values[key];
    }
  } as ConfigService;
}

function groundedResponse() {
  return jsonResponse({
    candidates: [
      {
        content: { parts: [{ text: "Grounded result." }] },
        groundingMetadata: {
          groundingChunks: [
            { web: { title: "Docs", uri: "https://example.com/docs" } }
          ],
          webSearchQueries: ["documentation"]
        }
      }
    ]
  });
}

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    headers: { "Content-Type": "application/json" },
    status
  });
}

function search(provider: GeminiGroundedResearchProvider) {
  return provider.search({
    query: "Find the current result",
    mode: "fast",
    researchRunId: "run-errors"
  });
}

async function unusedFetch(): Promise<Response> {
  throw new Error("Fetch should not be called");
}

function hasExceptionCode(error: unknown, code: string, status: number) {
  if (!(error instanceof HttpException) || error.getStatus() !== status) {
    return false;
  }

  const response = error.getResponse();
  return (
    typeof response === "object" &&
    response !== null &&
    "code" in response &&
    response.code === code
  );
}
