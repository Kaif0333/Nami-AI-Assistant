import { ResearchMode, ResearchSource } from "./research.types";

export type ResearchProviderStatus = {
  provider: "gemini";
  configured: boolean;
  model: string;
  supportedModes: ResearchMode[];
  supportsUrlContext: boolean;
  maxUrls: number;
  requestTimeoutMs: number;
};

export type GroundedSearchInput = {
  query: string;
  mode: ResearchMode;
  researchRunId: string;
  urls?: string[];
};

export type ResearchEvidence = {
  provider: "gemini";
  model: string;
  text: string;
  searchQueries: string[];
  sources: ResearchSource[];
  warnings: string[];
  usageMetadata: Record<string, unknown>;
};

export interface ResearchProvider {
  getStatus(): ResearchProviderStatus;
  search(input: GroundedSearchInput): Promise<ResearchEvidence>;
}

export type GeminiGroundingSegment = {
  startIndex?: number;
  endIndex?: number;
  text?: string;
};

export type GeminiGroundingSupport = {
  groundingChunkIndices?: number[];
  segment?: GeminiGroundingSegment;
};

export type GeminiGenerateContentResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
    finishReason?: string;
    groundingMetadata?: {
      groundingChunks?: Array<{
        web?: {
          title?: string;
          uri?: string;
        };
      }>;
      groundingSupports?: GeminiGroundingSupport[];
      webSearchQueries?: string[];
    };
    urlContextMetadata?: {
      urlMetadata?: Array<{
        retrievedUrl?: string;
        urlRetrievalStatus?: string;
      }>;
    };
  }>;
  usageMetadata?: Record<string, unknown>;
};

export type ResearchFetch = (
  input: string | URL | Request,
  init?: RequestInit
) => Promise<Response>;

export const RESEARCH_PROVIDER_NOT_CONFIGURED_MESSAGE =
  "Research provider is not configured.";
export const RESEARCH_PROVIDER_UNAVAILABLE_MESSAGE =
  "Research provider is unavailable. Please try again.";
export const RESEARCH_RATE_LIMITED_MESSAGE =
  "Research provider rate limit reached. Please try again later.";
export const RESEARCH_NO_SOURCES_MESSAGE =
  "Research did not return any valid sources.";
export const RESEARCH_URL_NOT_ALLOWED_MESSAGE =
  "Research URL is not allowed.";
export const RESEARCH_INVALID_REPORT_MESSAGE =
  "Research report is invalid.";
