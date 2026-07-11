import { ResearchMode } from "./research.types";
import { validateResearchUrls } from "./research-url-policy";

export type ResearchIntent = {
  matched: boolean;
  mode: ResearchMode;
  urls: string[];
  reason: "explicit" | "current" | "url" | "none";
};

const explicitResearchPattern =
  /\b(?:browse|research|search|look\s+up|find\s+online)\b/i;
const currentInformationPattern =
  /\b(?:latest|current|currently|today|recent|recently|newest|up[ -]to[ -]date|as\s+of\s+(?:today|now|\d{4}))\b/i;
const deepResearchPattern =
  /\b(?:deep\s+research|comprehensive|competitor\s+comparison|feasibility|compare\s+thoroughly)\b/i;
const urlPattern = /https?:\/\/[^\s<>"']+/gi;

export function classifyResearchIntent(message: string): ResearchIntent {
  const urls = extractPublicUrls(message);
  const mode: ResearchMode = deepResearchPattern.test(message) ? "deep" : "fast";

  if (explicitResearchPattern.test(message)) {
    return { matched: true, mode, urls, reason: "explicit" };
  }

  if (currentInformationPattern.test(message)) {
    return { matched: true, mode, urls, reason: "current" };
  }

  if (urls.length > 0) {
    return { matched: true, mode, urls, reason: "url" };
  }

  return { matched: false, mode, urls: [], reason: "none" };
}

function extractPublicUrls(message: string) {
  const candidates = (message.match(urlPattern) ?? []).map((candidate) =>
    candidate.replace(/[),.;!?]+$/, "")
  );
  const publicUrls: string[] = [];

  for (const candidate of candidates) {
    try {
      publicUrls.push(...validateResearchUrls([candidate]));
    } catch {
      // Unsafe URLs do not become research inputs.
    }
  }

  return [...new Set(publicUrls)].slice(0, 5);
}
