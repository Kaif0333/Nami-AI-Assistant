export const memoryTypes = [
  "profile",
  "project",
  "job",
  "client",
  "preference",
  "conversation",
  "document",
  "automation",
  "general"
] as const;

export type MemoryType = (typeof memoryTypes)[number];

export const memorySensitivities = ["public", "personal", "sensitive"] as const;

export type MemorySensitivity = (typeof memorySensitivities)[number];

export const memoryStatuses = ["active", "disabled", "archived"] as const;

export type MemoryStatus = (typeof memoryStatuses)[number];

export type MemoryRecord = {
  id: string;
  type: MemoryType;
  title: string;
  content: string;
  tags: string[];
  source: string;
  sensitivity: MemorySensitivity;
  status: MemoryStatus;
  createdAt: string;
  updatedAt: string;
  metadata: Record<string, unknown>;
  hasEmbedding: boolean;
};

export type CreateMemoryInput = {
  type: MemoryType;
  title: string;
  content: string;
  tags?: string[];
  source?: string;
  sensitivity?: MemorySensitivity;
  metadata?: Record<string, unknown>;
};

export type UpdateMemoryInput = Partial<
  Omit<CreateMemoryInput, "metadata"> & {
    status: MemoryStatus;
    metadata: Record<string, unknown>;
  }
>;

export type MemoryListFilters = {
  type?: MemoryType;
  sensitivity?: MemorySensitivity;
  status?: MemoryStatus;
  query?: string;
  tag?: string;
};

export type MemoryVectorStatus = {
  databaseConfigured: boolean;
  pgvectorSchemaReady: boolean;
  embeddingModelConfigured: boolean;
  semanticSearchEnabled: boolean;
  message: string;
};
