export const researchModes = ["fast", "deep"] as const;
export type ResearchMode = (typeof researchModes)[number];

export const researchStatuses = [
  "pending",
  "running",
  "completed",
  "partial",
  "failed"
] as const;
export type ResearchStatus = (typeof researchStatuses)[number];

export type ResearchReport = {
  summary: string;
  keyFindings: string[];
  recommendations: string[];
  risks: string[];
  actionPlan: string[];
};

export type ResearchSource = {
  id: string;
  researchRunId: string;
  url: string;
  normalizedUrl: string;
  title: string;
  domain: string;
  snippet: string;
  publishedAt: string | null;
  retrievedAt: string;
  sourceType: "web" | "url_context";
  citationMetadata: Record<string, unknown>;
  trusted: false;
  metadata: Record<string, unknown>;
};

export type ResearchRun = ResearchReport & {
  id: string;
  query: string;
  mode: ResearchMode;
  status: ResearchStatus;
  provider: string;
  model: string;
  searchQueries: string[];
  warnings: string[];
  errorMessage: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  metadata: Record<string, unknown>;
  sources: ResearchSource[];
};

export type ResearchRequestInput = {
  query: string;
  mode: ResearchMode;
  urls?: string[];
};
