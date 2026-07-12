import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { BadRequestException } from "@nestjs/common";

import { classifyResearchIntent } from "./research-intent-classifier";
import { parseResearchReport } from "./research-report-parser";
import { normalizeGroundingSources } from "./research-source-normalizer";
import {
  validatePublicResearchUrls,
  validateResearchUrls
} from "./research-url-policy";

describe("research URL policy", () => {
  it("normalizes, de-duplicates, and bounds public HTTP(S) URLs", () => {
    assert.deepEqual(
      validateResearchUrls([
        "https://example.com/docs",
        "https://example.com/docs",
        "http://example.org/one",
        "https://example.net/two",
        "https://example.edu/three",
        "https://example.io/four",
        "https://example.dev/five"
      ]),
      [
        "https://example.com/docs",
        "http://example.org/one",
        "https://example.net/two",
        "https://example.edu/three",
        "https://example.io/four"
      ]
    );
  });

  it("strips non-secret query and fragment values from normalized URLs", () => {
    assert.deepEqual(
      validateResearchUrls([
        "https://example.com/docs?topic=research#overview"
      ]),
      ["https://example.com/docs"]
    );
  });

  it("rejects non-public hosts, credentials, schemes, and ports", () => {
    const deeplyEncodedSecretPath = encodeEveryCharacter(
      "credentials/token/sk-secret-123456",
      5
    );
    const rejectedUrls = [
      "http://localhost/admin",
      "http://api.localhost/admin",
      "http://localhost.localdomain/admin",
      "https://foo.example/docs",
      "http://127.0.0.1.nip.io/admin",
      "http://169.254.169.254.sslip.io/latest",
      "http://api.localtest.me/admin",
      "http://api.lvh.me/admin",
      "http://api.vcap.me/admin",
      "http://api.localhost.direct/admin",
      "http://api.local.gd/admin",
      "http://api.traefik.me/admin",
      "http://intranet/admin",
      "http://service.local/admin",
      "http://metadata.google.internal/admin",
      "http://service.lan/admin",
      "http://router.home/admin",
      "http://service.corp/admin",
      "https://service.test/path",
      "https://service.invalid/path",
      "https://router.home.arpa/path",
      "http://0.1.2.3/admin",
      "http://10.0.0.1/admin",
      "http://100.64.0.1/admin",
      "http://127.0.0.1/admin",
      "http://169.254.0.1/admin",
      "http://172.16.0.1/admin",
      "http://192.168.0.1/admin",
      "http://192.0.2.1/admin",
      "http://198.18.0.1/admin",
      "http://198.51.100.1/admin",
      "http://203.0.113.1/admin",
      "http://224.0.0.1/admin",
      "http://240.0.0.1/admin",
      "https://93.184.216.34/",
      "http://[::]/admin",
      "http://[::1]/admin",
      "http://[::ffff:127.0.0.1]/admin",
      "http://[64:ff9b:1::1]/",
      "http://[100::1]/admin",
      "http://[2001:db8::1]/admin",
      "http://[ff00::1]/admin",
      "http://[fc00::1]/admin",
      "http://[fdff::1]/admin",
      "http://[fe80::1]/admin",
      "https://user:password@example.com/private",
      "file:///C:/secret.txt",
      "ftp://example.com/archive",
      "https://example.com:8080/admin",
      "https://example.com/docs?api_key=secret-value",
      "https://example.com/docs#access_token=secret-value",
      `https://example.com/${deeplyEncodedSecretPath}`
    ];

    for (const url of rejectedUrls) {
      assert.throws(
        () => validateResearchUrls([url]),
        (error) => hasExceptionCode(error, "RESEARCH_URL_NOT_ALLOWED"),
        url
      );
    }
  });

  it("rejects public-looking hostnames that resolve to non-public addresses", async () => {
    for (const address of ["127.0.0.1", "10.1.2.3", "169.254.169.254", "::1", "fd00::1", "fe80::1"]) {
      await assert.rejects(
        () =>
          validatePublicResearchUrls(
            ["https://public-looking.example.com/docs"],
            async () => [address]
          ),
        (error) => hasExceptionCode(error, "RESEARCH_URL_NOT_ALLOWED"),
        address
      );
    }
  });

  it("accepts public-looking hostnames only when every resolved address is public", async () => {
    assert.deepEqual(
      await validatePublicResearchUrls(
        ["https://public-looking.example.com/docs"],
        async () => ["93.184.216.34", "2606:2800:220:1:248:1893:25c8:1946"]
      ),
      ["https://public-looking.example.com/docs"]
    );
  });
});

describe("research intent classifier", () => {
  it("matches explicit, current, and public URL research requests", () => {
    assert.deepEqual(classifyResearchIntent("Please research TypeScript 6."), {
      matched: true,
      mode: "fast",
      urls: [],
      reason: "explicit"
    });
    assert.deepEqual(classifyResearchIntent("Search TypeScript 6."), {
      matched: true,
      mode: "fast",
      urls: [],
      reason: "explicit"
    });
    assert.equal(
      classifyResearchIntent("What is the latest Next.js version?").reason,
      "current"
    );
    assert.deepEqual(
      classifyResearchIntent("Review https://example.com/docs for me."),
      {
        matched: true,
        mode: "fast",
        urls: ["https://example.com/docs"],
        reason: "url"
      }
    );
  });

  it("uses deep mode only for deterministic deep-research terms", () => {
    for (const message of [
      "Do deep research on web research tools",
      "Create a comprehensive current market review",
      "Research a competitor comparison",
      "Research the feasibility of this product",
      "Compare thoroughly using web sources"
    ]) {
      assert.equal(classifyResearchIntent(message).mode, "deep", message);
    }
  });

  it("does not route ordinary coding or unsafe URL requests to research", () => {
    assert.deepEqual(
      classifyResearchIntent("Help me write a stable sorting function"),
      { matched: false, mode: "fast", urls: [], reason: "none" }
    );
    assert.deepEqual(classifyResearchIntent("Open http://127.0.0.1/admin"), {
      matched: false,
      mode: "fast",
      urls: [],
      reason: "none"
    });
  });
});

describe("grounding source normalization", () => {
  it("uses grounding metadata rather than generated link text", async () => {
    const sources = await normalizeGroundingSources(
      {
        candidates: [
          {
            content: {
              parts: [
                { text: "Generated [fake link](https://attacker.example/fake)." }
              ]
            },
            groundingMetadata: {
              groundingChunks: [
                {
                  web: {
                    title: "Example Documentation",
                    uri: "https://example.com/docs"
                  }
                }
              ],
              groundingSupports: [
                {
                  groundingChunkIndices: [0],
                  segment: { endIndex: 14, startIndex: 0, text: "Grounded fact." }
                }
              ],
              webSearchQueries: ["current example documentation"]
            }
          }
        ]
      },
      "run-123",
      publicResolver
    );

    assert.equal(sources.length, 1);
    assert.equal(sources[0]?.researchRunId, "run-123");
    assert.equal(sources[0]?.url, "https://example.com/docs");
    assert.equal(sources[0]?.normalizedUrl, "https://example.com/docs");
    assert.equal(sources[0]?.title, "Example Documentation");
    assert.equal(sources[0]?.domain, "example.com");
    assert.equal(sources[0]?.sourceType, "web");
    assert.equal(sources[0]?.trusted, false);
    assert.deepEqual(sources[0]?.citationMetadata, {
      chunkIndex: 0,
      supports: [
        {
          endIndex: 14,
          startIndex: 0,
          text: "Grounded fact."
        }
      ]
    });
  });

  it("normalizes URL Context metadata and removes duplicate source URLs", async () => {
    const sources = await normalizeGroundingSources(
      {
        candidates: [
          {
            groundingMetadata: {
              groundingChunks: [
                { web: { title: "Docs", uri: "https://example.com/docs" } }
              ]
            },
            urlContextMetadata: {
              urlMetadata: [
                {
                  retrievedUrl: "https://example.com/docs",
                  urlRetrievalStatus: "URL_RETRIEVAL_STATUS_SUCCESS"
                },
                {
                  retrievedUrl: "https://example.org/guide",
                  urlRetrievalStatus: "URL_RETRIEVAL_STATUS_SUCCESS"
                }
              ]
            }
          }
        ]
      },
      "run-456",
      publicResolver
    );

    assert.equal(sources.length, 2);
    assert.equal(sources[0]?.sourceType, "web");
    assert.equal(sources[1]?.sourceType, "url_context");
    assert.equal(sources[1]?.normalizedUrl, "https://example.org/guide");
  });

  it("stores only normalized safe source URLs from provider metadata", async () => {
    const sources = await normalizeGroundingSources(
      {
        candidates: [
          {
            groundingMetadata: {
              groundingChunks: [
                {
                  web: {
                    title: "Docs",
                    uri: "https://example.com/docs?utm_source=provider#section"
                  }
                },
                {
                  web: {
                    title: "Metadata service",
                    uri: "http://169.254.169.254.nip.io/latest"
                  }
                }
              ]
            },
            urlContextMetadata: {
              urlMetadata: [
                {
                  retrievedUrl: "https://example.org/guide?view=full#top",
                  urlRetrievalStatus: "URL_RETRIEVAL_STATUS_SUCCESS"
                },
                {
                  retrievedUrl: "https://localtest.me/admin",
                  urlRetrievalStatus: "URL_RETRIEVAL_STATUS_SUCCESS"
                }
              ]
            }
          }
        ]
      },
      "run-safe-urls",
      publicResolver
    );

    assert.equal(sources.length, 2);
    assert.deepEqual(
      sources.map((source) => source.url),
      ["https://example.com/docs", "https://example.org/guide"]
    );
    assert.deepEqual(
      sources.map((source) => source.normalizedUrl),
      ["https://example.com/docs", "https://example.org/guide"]
    );
  });

  it("requires successful URL Context retrieval before creating a source", async () => {
    const sources = await normalizeGroundingSources(
      {
        candidates: [
          {
            urlContextMetadata: {
              urlMetadata: [{ retrievedUrl: "https://example.com/docs" }]
            }
          }
        ]
      },
      "run-missing-status",
      publicResolver
    );

    assert.deepEqual(sources, []);
  });

  it("drops provider sources whose public-looking hostnames resolve to private addresses", async () => {
    const sources = await normalizeGroundingSources(
      {
        candidates: [
          {
            groundingMetadata: {
              groundingChunks: [
                {
                  web: {
                    title: "Unsafe source",
                    uri: "https://public-looking.example.com/docs"
                  }
                }
              ]
            }
          }
        ]
      },
      "run-resolved-private",
      async () => ["127.0.0.1"]
    );

    assert.deepEqual(sources, []);
  });
});

async function publicResolver() {
  return ["93.184.216.34"];
}

describe("research report parser", () => {
  it("parses the exact required report sections", () => {
    const report = parseResearchReport(`## Summary
Current result.

## Key Findings
- Finding one
- Finding two

## Recommendations
1. Recommendation one

## Risks
- Risk one

## Action Plan
1. Action one`);

    assert.equal(report.summary, "Current result.");
    assert.deepEqual(report.keyFindings, ["Finding one", "Finding two"]);
    assert.deepEqual(report.recommendations, ["Recommendation one"]);
    assert.deepEqual(report.risks, ["Risk one"]);
    assert.deepEqual(report.actionPlan, ["Action one"]);
  });

  it("parses valid non-Latin report content", () => {
    const report = parseResearchReport(`## Summary
यह शोध का सारांश है।

## Key Findings
- पहला निष्कर्ष

## Recommendations
- यह सुझाव है

## Risks
- संभावित जोखिम

## Action Plan
- अगला कदम`);

    assert.equal(report.summary, "यह शोध का सारांश है।");
    assert.deepEqual(report.keyFindings, ["पहला निष्कर्ष"]);
    assert.deepEqual(report.recommendations, ["यह सुझाव है"]);
    assert.deepEqual(report.risks, ["संभावित जोखिम"]);
    assert.deepEqual(report.actionPlan, ["अगला कदम"]);
  });

  it("rejects reports with missing or inexact headings", () => {
    for (const markdown of [
      "## Summary\nIncomplete.",
      "## summary\nResult.\n## Key Findings\n- One\n## Recommendations\n- One\n## Risks\n- One\n## Action Plan\n- One"
    ]) {
      assert.throws(
        () => parseResearchReport(markdown),
        (error) => hasExceptionCode(error, "RESEARCH_INVALID_REPORT")
      );
    }
  });

  it("rejects reports without meaningful content in every required section", () => {
    const invalidReports = [
      [
        "## Summary",
        "",
        "## Key Findings",
        "",
        "## Recommendations",
        "",
        "## Risks",
        "",
        "## Action Plan"
      ].join("\n"),
      [
        "## Summary",
        "Current result.",
        "## Key Findings",
        "-",
        "## Recommendations",
        "- Recommendation one",
        "## Risks",
        "- Risk one",
        "## Action Plan",
        "- Action one"
      ].join("\n")
    ];

    invalidReports.push(
      [
        "## Summary",
        "...",
        "## Key Findings",
        "- !!!",
        "## Recommendations",
        "- ???",
        "## Risks",
        "- ...",
        "## Action Plan",
        "- !!!"
      ].join("\n")
    );

    for (const summaryMarker of ["-", "*", "+"]) {
      invalidReports.push(
        [
          "## Summary",
          summaryMarker,
          "## Key Findings",
          "- Finding one",
          "## Recommendations",
          "- Recommendation one",
          "## Risks",
          "- Risk one",
          "## Action Plan",
          "- Action one"
        ].join("\n")
      );
    }

    for (const markdown of invalidReports) {
      assert.throws(
        () => parseResearchReport(markdown),
        (error) => hasExceptionCode(error, "RESEARCH_INVALID_REPORT")
      );
    }
  });
});

function hasExceptionCode(error: unknown, code: string) {
  if (!(error instanceof BadRequestException)) {
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

function encodeEveryCharacter(value: string, rounds: number) {
  let encoded = value;

  for (let round = 0; round < rounds; round += 1) {
    encoded = [...Buffer.from(encoded, "utf8")]
      .map((byte) => `%${byte.toString(16).padStart(2, "0")}`)
      .join("");
  }

  return encoded;
}
