"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { ActionLog, listActionLogs } from "@/lib/nami-api";

const statusOptions = [
  "all",
  "planned",
  "approval_required",
  "approved",
  "rejected",
  "running",
  "completed",
  "failed",
  "cancelled",
  "blocked"
];

const riskOptions = ["all", "low", "medium", "high", "blocked"];

function riskVariant(riskLevel: ActionLog["riskLevel"]) {
  if (riskLevel === "high" || riskLevel === "blocked") {
    return "destructive" as const;
  }

  if (riskLevel === "medium") {
    return "secondary" as const;
  }

  return "outline" as const;
}

function statusVariant(status: ActionLog["status"]) {
  if (status === "failed" || status === "blocked" || status === "rejected") {
    return "destructive" as const;
  }

  if (status === "completed" || status === "approved") {
    return "default" as const;
  }

  return "secondary" as const;
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function formatPreview(value: Record<string, unknown>) {
  return JSON.stringify(value, null, 2);
}

export default function LogsPage() {
  const [logs, setLogs] = useState<ActionLog[]>([]);
  const [status, setStatus] = useState("all");
  const [riskLevel, setRiskLevel] = useState("all");
  const [actionType, setActionType] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filters = useMemo(
    () => ({
      status: status === "all" ? undefined : status,
      riskLevel: riskLevel === "all" ? undefined : riskLevel,
      actionType: actionType.trim() || undefined
    }),
    [actionType, riskLevel, status]
  );

  const loadLogs = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      setLogs(await listActionLogs(filters));
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : "Unable to load logs."
      );
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadLogs();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadLogs]);

  return (
    <AppShell
      title="Logs"
      description="Audit trail for approvals, policy decisions, and safe action flow."
    >
      <Card>
        <CardHeader className="flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>Action Logs</CardTitle>
            <CardDescription>
              Records for planned, approval-gated, blocked, and completed actions.
            </CardDescription>
          </div>
          <Button
            aria-label="Refresh action logs"
            disabled={isLoading}
            onClick={() => void loadLogs()}
            size="icon"
            type="button"
            variant="outline"
          >
            <RefreshCw aria-hidden className="size-4" />
          </Button>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {error ? (
            <div className="flex gap-3 rounded-lg border border-destructive bg-destructive/10 p-3 text-sm text-foreground">
              <AlertTriangle aria-hidden className="mt-0.5 size-4 text-destructive" />
              {error}
            </div>
          ) : null}

          <div className="grid gap-3 md:grid-cols-3">
            <label className="flex flex-col gap-1 text-sm font-medium text-foreground">
              Status
              <select
                className="h-10 rounded-md border border-input bg-background px-3 text-sm font-normal text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onChange={(event) => setStatus(event.target.value)}
                value={status}
              >
                {statusOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-foreground">
              Risk
              <select
                className="h-10 rounded-md border border-input bg-background px-3 text-sm font-normal text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onChange={(event) => setRiskLevel(event.target.value)}
                value={riskLevel}
              >
                {riskOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-foreground">
              Action type
              <input
                className="h-10 rounded-md border border-input bg-background px-3 text-sm font-normal text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onChange={(event) => setActionType(event.target.value)}
                placeholder="send_email"
                value={actionType}
              />
            </label>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Risk</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Summary</TableHead>
                  <TableHead>Approval</TableHead>
                  <TableHead>Error</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <Fragment key={log.id}>
                    <TableRow
                      className="cursor-pointer"
                      onClick={() =>
                        setExpandedId((current) =>
                          current === log.id ? null : log.id
                        )
                      }
                    >
                      <TableCell className="min-w-36 text-muted-foreground">
                        {formatTime(log.createdAt)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusVariant(log.status)}>
                          {log.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={riskVariant(log.riskLevel)}>
                          {log.riskLevel}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium text-foreground">
                        {log.actionType}
                      </TableCell>
                      <TableCell className="min-w-56">{log.summary}</TableCell>
                      <TableCell className="max-w-44 truncate text-muted-foreground">
                        {log.approvalId ?? "-"}
                      </TableCell>
                      <TableCell className="max-w-56 truncate text-destructive">
                        {log.errorMessage ?? "-"}
                      </TableCell>
                    </TableRow>
                    {expandedId === log.id ? (
                      <TableRow key={`${log.id}-details`}>
                        <TableCell colSpan={7}>
                          <pre className="max-h-72 overflow-auto rounded-md border border-border bg-background p-3 text-xs leading-5 text-muted-foreground">
                            {formatPreview({
                              id: log.id,
                              commandId: log.commandId,
                              approvalId: log.approvalId,
                              inputPreview: log.inputPreview,
                              outputPreview: log.outputPreview,
                              metadata: log.metadata,
                              startedAt: log.startedAt,
                              completedAt: log.completedAt
                            })}
                          </pre>
                        </TableCell>
                      </TableRow>
                    ) : null}
                  </Fragment>
                ))}
              </TableBody>
            </Table>
          </div>

          {!logs.length ? (
            <div className="rounded-lg border border-border bg-background p-6 text-sm text-muted-foreground">
              No action logs match the current filters.
            </div>
          ) : null}
        </CardContent>
      </Card>
    </AppShell>
  );
}
