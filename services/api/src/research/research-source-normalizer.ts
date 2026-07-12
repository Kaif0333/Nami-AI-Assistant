import {
  GeminiGenerateContentResponse,
  GeminiGroundingSupport
} from "./research-provider.types";
import { ResearchSource } from "./research.types";
import {
  ResearchDnsResolver,
  validatePublicResearchUrls
} from "./research-url-policy";

export async function normalizeGroundingSources(
  response: GeminiGenerateContentResponse,
  researchRunId: string,
  resolver?: ResearchDnsResolver
): Promise<ResearchSource[]> {
  const sources: ResearchSource[] = [];
  const seenUrls = new Set<string>();
  const retrievedAt = new Date().toISOString();

  for (const candidate of response.candidates ?? []) {
    const metadata = candidate.groundingMetadata;

    for (const [chunkIndex, chunk] of (
      metadata?.groundingChunks ?? []
    ).entries()) {
      const web = chunk.web;

      if (!web?.uri) {
        continue;
      }

      const normalizedUrl = await safelyNormalizeUrl(web.uri, resolver);

      if (!normalizedUrl || seenUrls.has(normalizedUrl)) {
        continue;
      }

      seenUrls.add(normalizedUrl);
      const url = new URL(normalizedUrl);
      const supports = findSupports(metadata?.groundingSupports, chunkIndex);

      sources.push({
        id: `${researchRunId}:source:${sources.length + 1}`,
        researchRunId,
        url: normalizedUrl,
        normalizedUrl,
        title: web.title?.trim() || url.hostname,
        domain: url.hostname,
        snippet: "",
        publishedAt: null,
        retrievedAt,
        sourceType: "web",
        citationMetadata: { chunkIndex, supports },
        trusted: false,
        metadata: { provider: "gemini" }
      });
    }

    for (const urlMetadata of candidate.urlContextMetadata?.urlMetadata ?? []) {
      if (
        !urlMetadata.retrievedUrl ||
        urlMetadata.urlRetrievalStatus !== "URL_RETRIEVAL_STATUS_SUCCESS"
      ) {
        continue;
      }

      const normalizedUrl = await safelyNormalizeUrl(
        urlMetadata.retrievedUrl,
        resolver
      );

      if (!normalizedUrl || seenUrls.has(normalizedUrl)) {
        continue;
      }

      seenUrls.add(normalizedUrl);
      const url = new URL(normalizedUrl);

      sources.push({
        id: `${researchRunId}:source:${sources.length + 1}`,
        researchRunId,
        url: normalizedUrl,
        normalizedUrl,
        title: url.hostname,
        domain: url.hostname,
        snippet: "",
        publishedAt: null,
        retrievedAt,
        sourceType: "url_context",
        citationMetadata: {},
        trusted: false,
        metadata: {
          provider: "gemini",
          retrievalStatus: urlMetadata.urlRetrievalStatus ?? null
        }
      });
    }
  }

  return sources;
}

async function safelyNormalizeUrl(url: string, resolver?: ResearchDnsResolver) {
  try {
    return (await validatePublicResearchUrls([url], resolver))[0];
  } catch {
    return undefined;
  }
}

function findSupports(
  supports: GeminiGroundingSupport[] | undefined,
  chunkIndex: number
) {
  return (supports ?? [])
    .filter((support) => support.groundingChunkIndices?.includes(chunkIndex))
    .flatMap((support) => (support.segment ? [support.segment] : []))
    .map((segment) => ({
      ...(segment.endIndex === undefined ? {} : { endIndex: segment.endIndex }),
      ...(segment.startIndex === undefined
        ? {}
        : { startIndex: segment.startIndex }),
      ...(segment.text === undefined ? {} : { text: segment.text })
    }));
}
