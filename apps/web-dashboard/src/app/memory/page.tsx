"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArchiveX,
  BrainCircuit,
  Database,
  RefreshCw,
  Save,
  Search,
  Trash2
} from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  MemoryRecord,
  MemorySensitivity,
  MemoryType,
  createMemory,
  deleteMemory,
  disableMemory,
  getMemoryVectorStatus,
  listMemories
} from "@/lib/nami-api";

const memoryTypes: MemoryType[] = [
  "profile",
  "project",
  "job",
  "client",
  "preference",
  "conversation",
  "document",
  "automation",
  "general"
];

const sensitivities: MemorySensitivity[] = ["public", "personal", "sensitive"];

function formatTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function badgeVariant(memory: MemoryRecord) {
  if (memory.status === "disabled") {
    return "secondary" as const;
  }

  if (memory.sensitivity === "sensitive") {
    return "destructive" as const;
  }

  return "outline" as const;
}

function parseTags(value: string) {
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

export default function MemoryPage() {
  const [memories, setMemories] = useState<MemoryRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("active");
  const [typeFilter, setTypeFilter] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [vectorMessage, setVectorMessage] = useState("Checking vector status...");
  const [form, setForm] = useState({
    type: "general" as MemoryType,
    title: "",
    content: "",
    tags: "",
    source: "manual",
    sensitivity: "personal" as MemorySensitivity
  });

  const selectedMemory = useMemo(
    () => memories.find((memory) => memory.id === selectedId),
    [memories, selectedId]
  );

  const loadMemories = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [memoryList, vectorStatus] = await Promise.all([
        listMemories({
          query,
          status,
          type: typeFilter
        }),
        getMemoryVectorStatus()
      ]);

      setMemories(memoryList);
      setVectorMessage(vectorStatus.message);
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : "Unable to load memories."
      );
    } finally {
      setIsLoading(false);
    }
  }, [query, status, typeFilter]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadMemories();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadMemories]);

  async function saveMemory() {
    setActiveId("new");
    setError(null);

    try {
      const memory = await createMemory({
        type: form.type,
        title: form.title,
        content: form.content,
        tags: parseTags(form.tags),
        source: form.source,
        sensitivity: form.sensitivity
      });

      setMemories((current) => [memory, ...current]);
      setSelectedId(memory.id);
      setForm((current) => ({
        ...current,
        title: "",
        content: "",
        tags: ""
      }));
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : "Unable to save memory."
      );
    } finally {
      setActiveId(null);
    }
  }

  async function disableSelectedMemory(memory: MemoryRecord) {
    setActiveId(memory.id);
    setError(null);

    try {
      const updated = await disableMemory(memory.id);
      setMemories((current) =>
        current.map((item) => (item.id === updated.id ? updated : item))
      );
    } catch (disableError) {
      setError(
        disableError instanceof Error
          ? disableError.message
          : "Unable to disable memory."
      );
    } finally {
      setActiveId(null);
    }
  }

  async function deleteSelectedMemory(memory: MemoryRecord) {
    if (!window.confirm("Delete this memory from Nami?")) {
      return;
    }

    setActiveId(memory.id);
    setError(null);

    try {
      await deleteMemory(memory.id);
      setMemories((current) => current.filter((item) => item.id !== memory.id));
      setSelectedId(null);
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Unable to delete memory."
      );
    } finally {
      setActiveId(null);
    }
  }

  return (
    <AppShell
      title="Memory"
      description="Save, search, and manage what Nami is allowed to remember."
    >
      <div className="grid gap-4 xl:grid-cols-[24rem_1fr]">
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <BrainCircuit aria-hidden className="size-5 text-primary" />
                <CardTitle>Save Memory</CardTitle>
              </div>
              <CardDescription>
                Store useful context without secrets or hidden capture.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-2">
                <select
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                  value={form.type}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      type: event.target.value as MemoryType
                    }))
                  }
                >
                  {memoryTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
                <select
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                  value={form.sensitivity}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      sensitivity: event.target.value as MemorySensitivity
                    }))
                  }
                >
                  {sensitivities.map((sensitivity) => (
                    <option key={sensitivity} value={sensitivity}>
                      {sensitivity}
                    </option>
                  ))}
                </select>
              </div>
              <Input
                placeholder="Title"
                value={form.title}
                onChange={(event) =>
                  setForm((current) => ({ ...current, title: event.target.value }))
                }
              />
              <textarea
                className="min-h-32 rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="What should Nami remember?"
                value={form.content}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    content: event.target.value
                  }))
                }
              />
              <Input
                placeholder="Tags, comma separated"
                value={form.tags}
                onChange={(event) =>
                  setForm((current) => ({ ...current, tags: event.target.value }))
                }
              />
              <Input
                placeholder="Source"
                value={form.source}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    source: event.target.value
                  }))
                }
              />
              <Button
                disabled={
                  activeId === "new" ||
                  !form.title.trim() ||
                  !form.content.trim()
                }
                onClick={() => void saveMemory()}
                type="button"
              >
                <Save aria-hidden className="size-4" />
                Save memory
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Database aria-hidden className="size-5 text-primary" />
                <CardTitle>Vector Readiness</CardTitle>
              </div>
              <CardDescription>pgvector schema is prepared for semantic search.</CardDescription>
            </CardHeader>
            <CardContent className="text-sm leading-6 text-muted-foreground">
              {vectorMessage}
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader className="flex-row items-start justify-between gap-4">
              <div>
                <CardTitle>Memory Center</CardTitle>
                <CardDescription>
                  Search and review saved context before Nami uses it.
                </CardDescription>
              </div>
              <Button
                aria-label="Refresh memories"
                disabled={isLoading}
                onClick={() => void loadMemories()}
                size="icon"
                type="button"
                variant="outline"
              >
                <RefreshCw aria-hidden className="size-4" />
              </Button>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <div className="grid gap-2 md:grid-cols-[1fr_10rem_10rem]">
                <div className="relative">
                  <Search
                    aria-hidden
                    className="absolute left-3 top-2.5 size-4 text-muted-foreground"
                  />
                  <Input
                    className="pl-9"
                    placeholder="Search memories"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                  />
                </div>
                <select
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                  value={status}
                  onChange={(event) => setStatus(event.target.value)}
                >
                  <option value="active">active</option>
                  <option value="disabled">disabled</option>
                  <option value="archived">archived</option>
                  <option value="">all</option>
                </select>
                <select
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                  value={typeFilter}
                  onChange={(event) => setTypeFilter(event.target.value)}
                >
                  <option value="">all types</option>
                  {memoryTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>
              {error ? (
                <div className="rounded-md border border-destructive bg-destructive/10 p-3 text-sm">
                  {error}
                </div>
              ) : null}
            </CardContent>
          </Card>

          <div className="grid gap-3 lg:grid-cols-2">
            {memories.map((memory) => (
              <Card
                className="cursor-pointer transition-colors hover:bg-secondary"
                key={memory.id}
                onClick={() => setSelectedId(memory.id)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle className="text-base">{memory.title}</CardTitle>
                      <CardDescription>{memory.type}</CardDescription>
                    </div>
                    <Badge variant={badgeVariant(memory)}>
                      {memory.sensitivity}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="flex flex-col gap-3 text-sm">
                  <p className="line-clamp-3 leading-6 text-foreground">
                    {memory.content}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">{memory.status}</Badge>
                    {memory.tags.map((tag) => (
                      <Badge key={tag} variant="outline">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Updated {formatTime(memory.updatedAt)}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {!isLoading && memories.length === 0 ? (
            <Card>
              <CardContent className="py-6 text-sm text-muted-foreground">
                No memories found.
              </CardContent>
            </Card>
          ) : null}

          {selectedMemory ? (
            <Card>
              <CardHeader className="flex-row items-start justify-between gap-4">
                <div>
                  <CardTitle>{selectedMemory.title}</CardTitle>
                  <CardDescription>{selectedMemory.id}</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    disabled={
                      activeId === selectedMemory.id ||
                      selectedMemory.status === "disabled"
                    }
                    onClick={() => void disableSelectedMemory(selectedMemory)}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    <ArchiveX aria-hidden className="size-4" />
                    Disable
                  </Button>
                  <Button
                    disabled={activeId === selectedMemory.id}
                    onClick={() => void deleteSelectedMemory(selectedMemory)}
                    size="sm"
                    type="button"
                    variant="destructive"
                  >
                    <Trash2 aria-hidden className="size-4" />
                    Delete
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-3 text-sm">
                <p className="leading-6">{selectedMemory.content}</p>
                <pre className="max-h-56 overflow-auto rounded-md border border-border bg-background p-3 text-xs leading-5 text-muted-foreground">
                  {JSON.stringify(
                    {
                      source: selectedMemory.source,
                      status: selectedMemory.status,
                      type: selectedMemory.type,
                      tags: selectedMemory.tags,
                      hasEmbedding: selectedMemory.hasEmbedding,
                      metadata: selectedMemory.metadata,
                      createdAt: selectedMemory.createdAt,
                      updatedAt: selectedMemory.updatedAt
                    },
                    null,
                    2
                  )}
                </pre>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </AppShell>
  );
}
