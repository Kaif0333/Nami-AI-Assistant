"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  BookOpenCheck,
  CheckCircle2,
  Clock3,
  ExternalLink,
  Globe2,
  Loader2,
  Plus,
  Search,
  X
} from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  getResearchRun,
  getResearchStatus,
  listResearchRuns,
  runResearch,
  sanitizePublicResearchUrl
} from "@/lib/nami-api";
import type {
  ResearchMode,
  ResearchRun,
  ResearchSource,
  ResearchStatusData
} from "@/lib/nami-api";
import { cn } from "@/lib/utils";

type RequestStage = "idle" | "searching" | "synthesizing";

const maxUrlInputs = 5;

function formatTimestamp(value: string | null) {
  if (!value) {
    return "Not completed";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown time";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

function statusVariant(status: ResearchRun["status"]) {
  if (status === "failed") {
    return "destructive" as const;
  }

  if (status === "completed") {
    return "default" as const;
  }

  return "secondary" as const;
}

function ReportList({ items }: { items: string[] }) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">None reported.</p>;
  }

  return (
    <ul className="space-y-2 text-sm leading-6 text-foreground">
      {items.map((item, index) => (
        <li className="flex gap-2" key={`${index}-${item}`}>
          <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function SourceRow({ source }: { source: ResearchSource }) {
  const href = sanitizePublicResearchUrl(source.url);

  return (
    <div className="border-t border-border py-3 first:border-t-0 first:pt-0 last:pb-0">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {href ? (
            <a
              className="inline-flex max-w-full items-center gap-1.5 text-sm font-medium text-foreground hover:text-primary"
              href={href}
              rel="noreferrer noopener"
              target="_blank"
            >
              <span className="truncate">{source.title || source.domain}</span>
              <ExternalLink aria-hidden className="size-3.5 shrink-0" />
            </a>
          ) : (
            <p className="text-sm font-medium text-foreground">
              {source.title || source.domain}
            </p>
          )}
          <p className="mt-1 text-xs text-muted-foreground">
            {source.domain} - Retrieved {formatTimestamp(source.retrievedAt)}
          </p>
        </div>
        <Badge className="shrink-0" variant="outline">
          {source.sourceType === "url_context" ? "URL" : "Web"}
        </Badge>
      </div>
      {source.snippet ? (
        <p className="mt-2 line-clamp-2 text-xs leading-5 text-muted-foreground">
          {source.snippet}
        </p>
      ) : null}
    </div>
  );
}

export default function ResearchPage() {
  const synthesisTimerRef = useRef<number | null>(null);
  const [mode, setMode] = useState<ResearchMode>("fast");
  const [query, setQuery] = useState("");
  const [urls, setUrls] = useState<string[]>([""]);
  const [requestStage, setRequestStage] = useState<RequestStage>("idle");
  const [status, setStatus] = useState<ResearchStatusData | null>(null);
  const [runs, setRuns] = useState<ResearchRun[]>([]);
  const [selectedRun, setSelectedRun] = useState<ResearchRun | null>(null);
  const [isLoadingInitial, setIsLoadingInitial] = useState(true);
  const [loadingRunId, setLoadingRunId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isRunning = requestStage !== "idle";

  const loadDashboard = useCallback(async () => {
    setIsLoadingInitial(true);
    setError(null);

    try {
      const [researchStatus, recentRuns] = await Promise.all([
        getResearchStatus(),
        listResearchRuns()
      ]);
      setStatus(researchStatus);
      setRuns(recentRuns);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load research workspace."
      );
    } finally {
      setIsLoadingInitial(false);
    }
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => void loadDashboard(), 0);

    return () => {
      window.clearTimeout(timeout);
      if (synthesisTimerRef.current) {
        window.clearTimeout(synthesisTimerRef.current);
      }
    };
  }, [loadDashboard]);

  function updateUrl(index: number, value: string) {
    setUrls((current) =>
      current.map((url, currentIndex) => (currentIndex === index ? value : url))
    );
  }

  function removeUrl(index: number) {
    setUrls((current) => {
      const next = current.filter((_, currentIndex) => currentIndex !== index);
      return next.length > 0 ? next : [""];
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedQuery = query.trim();

    if (!trimmedQuery || isRunning) {
      return;
    }

    setError(null);
    setRequestStage("searching");
    synthesisTimerRef.current = window.setTimeout(
      () => setRequestStage("synthesizing"),
      900
    );

    try {
      const run = await runResearch({
        query: trimmedQuery,
        mode,
        urls: urls.map((url) => url.trim()).filter(Boolean)
      });
      setSelectedRun(run);
      setRuns((current) => [run, ...current.filter((item) => item.id !== run.id)]);
    } catch (runError) {
      setError(
        runError instanceof Error ? runError.message : "Research request failed."
      );
    } finally {
      if (synthesisTimerRef.current) {
        window.clearTimeout(synthesisTimerRef.current);
      }
      setRequestStage("idle");
    }
  }

  async function handleSelectRun(id: string) {
    if (isRunning || loadingRunId) {
      return;
    }

    setLoadingRunId(id);
    setError(null);

    try {
      setSelectedRun(await getResearchRun(id));
    } catch (runError) {
      setError(
        runError instanceof Error
          ? runError.message
          : "Unable to load this research run."
      );
    } finally {
      setLoadingRunId(null);
    }
  }

  return (
    <AppShell
      title="Research"
      description="Run source-backed web research and review cited findings."
    >
      <div className="grid gap-4 xl:grid-cols-[22rem_minmax(0,1fr)_20rem]">
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Search aria-hidden className="size-5 text-primary" />
                <CardTitle>New research</CardTitle>
              </div>
              <CardDescription>
                Search the public web or add specific public URLs.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
                <div>
                  <div className="mb-2 text-xs font-medium text-foreground">Mode</div>
                  <div
                    aria-label="Research mode"
                    className="grid h-10 grid-cols-2 rounded-md border border-input bg-background p-1"
                    role="group"
                  >
                    {(["fast", "deep"] as const).map((option) => (
                      <button
                        aria-pressed={mode === option}
                        className={cn(
                          "h-8 rounded-sm text-sm font-medium capitalize text-muted-foreground transition-colors",
                          mode === option && "bg-primary text-primary-foreground"
                        )}
                        disabled={isRunning}
                        key={option}
                        onClick={() => setMode(option)}
                        type="button"
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </div>

                <label className="flex flex-col gap-2 text-xs font-medium text-foreground">
                  Query
                  <textarea
                    className="min-h-32 resize-y rounded-md border border-input bg-background px-3 py-2 text-sm font-normal leading-6 text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={isRunning}
                    maxLength={4000}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="What should Nami investigate?"
                    value={query}
                  />
                </label>

                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-medium text-foreground">
                      Source URLs
                    </span>
                    <Button
                      aria-label="Add source URL"
                      disabled={urls.length >= maxUrlInputs || isRunning}
                      onClick={() => setUrls((current) => [...current, ""])}
                      size="icon"
                      title="Add source URL"
                      type="button"
                      variant="ghost"
                    >
                      <Plus aria-hidden className="size-4" />
                    </Button>
                  </div>
                  {urls.map((url, index) => (
                    <div className="flex gap-2" key={index}>
                      <Input
                        aria-label={`Source URL ${index + 1}`}
                        disabled={isRunning}
                        onChange={(event) => updateUrl(index, event.target.value)}
                        placeholder="https://example.com"
                        type="url"
                        value={url}
                      />
                      <Button
                        aria-label={`Remove source URL ${index + 1}`}
                        disabled={isRunning}
                        onClick={() => removeUrl(index)}
                        size="icon"
                        title="Remove source URL"
                        type="button"
                        variant="outline"
                      >
                        <X aria-hidden className="size-4" />
                      </Button>
                    </div>
                  ))}
                </div>

                <Button disabled={!query.trim() || isRunning} type="submit">
                  {isRunning ? (
                    <Loader2 aria-hidden className="size-4 animate-spin" />
                  ) : (
                    <Search aria-hidden className="size-4" />
                  )}
                  {requestStage === "searching"
                    ? "Searching sources"
                    : requestStage === "synthesizing"
                      ? "Synthesizing report"
                      : "Start research"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Globe2 aria-hidden className="size-5 text-primary" />
                <CardTitle>Provider status</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {isLoadingInitial ? (
                <p className="text-muted-foreground">Checking research service...</p>
              ) : status ? (
                <>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">Provider</span>
                    <span className="font-medium text-foreground">{status.provider}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">Search model</span>
                    <span className="truncate font-medium text-foreground">
                      {status.model}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">Readiness</span>
                    <Badge variant={status.configured ? "default" : "secondary"}>
                      {status.configured ? "Configured" : "Setup required"}
                    </Badge>
                  </div>
                </>
              ) : (
                <p className="text-muted-foreground">Status unavailable.</p>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="min-w-0">
          <CardHeader className="flex-row items-start justify-between gap-4">
            <div className="min-w-0">
              <CardTitle>Research report</CardTitle>
              <CardDescription className="mt-1">
                {selectedRun ? selectedRun.query : "Select or start a research run."}
              </CardDescription>
            </div>
            {selectedRun ? (
              <Badge className="shrink-0 capitalize" variant={statusVariant(selectedRun.status)}>
                {selectedRun.status}
              </Badge>
            ) : null}
          </CardHeader>
          <CardContent>
            {isRunning ? (
              <div className="flex min-h-80 flex-col items-center justify-center text-center">
                <Loader2 aria-hidden className="size-8 animate-spin text-primary" />
                <p className="mt-4 text-sm font-medium text-foreground">
                  {requestStage === "searching"
                    ? "Searching grounded sources"
                    : "Synthesizing the cited report"}
                </p>
                <p className="mt-1 max-w-sm text-xs leading-5 text-muted-foreground">
                  {mode === "deep"
                    ? "Deep mode may run several focused searches before synthesis."
                    : "Fast mode performs one focused grounded search."}
                </p>
              </div>
            ) : error ? (
              <div className="flex min-h-80 flex-col items-center justify-center text-center">
                <AlertTriangle aria-hidden className="size-8 text-destructive" />
                <p className="mt-4 text-sm font-medium text-foreground">
                  Research unavailable
                </p>
                <p className="mt-1 max-w-md text-sm leading-6 text-muted-foreground">
                  {error}
                </p>
              </div>
            ) : !selectedRun ? (
              <div className="flex min-h-80 flex-col items-center justify-center text-center">
                <BookOpenCheck aria-hidden className="size-8 text-primary" />
                <p className="mt-4 text-sm font-medium text-foreground">
                  No report selected
                </p>
                <p className="mt-1 max-w-sm text-xs leading-5 text-muted-foreground">
                  Start a source-backed run or open one from recent history.
                </p>
              </div>
            ) : selectedRun.status === "failed" ? (
              <div className="flex min-h-80 flex-col items-center justify-center text-center">
                <AlertTriangle aria-hidden className="size-8 text-destructive" />
                <p className="mt-4 text-sm font-medium text-foreground">Research failed</p>
                <p className="mt-1 max-w-md text-sm leading-6 text-muted-foreground">
                  {selectedRun.errorMessage || "No cited report was produced."}
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {selectedRun.status === "partial" ? (
                  <div className="flex gap-3 rounded-md border border-primary/35 bg-primary/10 p-3 text-sm">
                    <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0 text-primary" />
                    <div>
                      <p className="font-medium text-foreground">Partial research</p>
                      <p className="mt-1 leading-5 text-muted-foreground">
                        Some search branches were unavailable. Review the warnings and sources.
                      </p>
                    </div>
                  </div>
                ) : null}

                <section>
                  <h2 className="text-sm font-semibold text-foreground">Summary</h2>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                    {selectedRun.summary || "No summary was returned."}
                  </p>
                </section>
                {[
                  ["Key findings", selectedRun.keyFindings],
                  ["Recommendations", selectedRun.recommendations],
                  ["Risks", selectedRun.risks],
                  ["Action plan", selectedRun.actionPlan]
                ].map(([title, items]) => (
                  <section className="border-t border-border pt-5" key={title as string}>
                    <h2 className="mb-2 text-sm font-semibold text-foreground">
                      {title as string}
                    </h2>
                    <ReportList items={items as string[]} />
                  </section>
                ))}

                {selectedRun.warnings.length > 0 ? (
                  <section className="border-t border-border pt-5">
                    <h2 className="mb-2 text-sm font-semibold text-foreground">Warnings</h2>
                    <ReportList items={selectedRun.warnings} />
                  </section>
                ) : null}

                <section className="border-t border-border pt-5">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <h2 className="text-sm font-semibold text-foreground">Sources</h2>
                    <span className="text-xs text-muted-foreground">
                      {selectedRun.sources.length} cited
                    </span>
                  </div>
                  {selectedRun.sources.length > 0 ? (
                    selectedRun.sources.map((source) => (
                      <SourceRow key={source.id} source={source} />
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No sources available.</p>
                  )}
                </section>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border pt-4 text-xs text-muted-foreground">
                  <span className="capitalize">{selectedRun.mode} mode</span>
                  <span>{selectedRun.provider}/{selectedRun.model}</span>
                  <span>Completed {formatTimestamp(selectedRun.completedAt)}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="min-w-0">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Clock3 aria-hidden className="size-5 text-primary" />
              <CardTitle>Recent history</CardTitle>
            </div>
            <CardDescription>Open a run to reload its full report.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {isLoadingInitial ? (
              <p className="py-4 text-sm text-muted-foreground">Loading research history...</p>
            ) : runs.length === 0 ? (
              <p className="py-4 text-sm text-muted-foreground">No research runs yet.</p>
            ) : (
              runs.map((run) => (
                <button
                  className={cn(
                    "w-full rounded-md border border-border bg-background p-3 text-left transition-colors hover:bg-accent disabled:cursor-wait disabled:opacity-60",
                    selectedRun?.id === run.id && "border-primary/40 bg-primary/10"
                  )}
                  disabled={isRunning || Boolean(loadingRunId)}
                  key={run.id}
                  onClick={() => void handleSelectRun(run.id)}
                  type="button"
                >
                  <span className="line-clamp-2 text-sm font-medium leading-5 text-foreground">
                    {run.query}
                  </span>
                  <span className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    {loadingRunId === run.id ? (
                      <Loader2 aria-hidden className="size-3 animate-spin" />
                    ) : run.status === "completed" ? (
                      <CheckCircle2 aria-hidden className="size-3 text-primary" />
                    ) : (
                      <AlertTriangle aria-hidden className="size-3" />
                    )}
                    <span className="capitalize">{run.mode}</span>
                    <span className="capitalize">{run.status}</span>
                    <span>{run.sources.length} sources</span>
                  </span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {formatTimestamp(run.createdAt)}
                  </span>
                </button>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
