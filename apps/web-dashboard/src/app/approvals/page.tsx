"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  RefreshCw,
  ShieldCheck,
  XCircle
} from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ApprovalRequest,
  approveApproval,
  createDemoSendEmailApproval,
  listApprovals,
  rejectApproval
} from "@/lib/nami-api";
import { cn } from "@/lib/utils";

const statusGroups = [
  { label: "Pending", value: "pending", icon: Clock3 },
  { label: "Approved", value: "approved", icon: CheckCircle2 },
  { label: "Rejected", value: "rejected", icon: XCircle }
] as const;

function riskVariant(riskLevel: ApprovalRequest["riskLevel"]) {
  if (riskLevel === "high" || riskLevel === "blocked") {
    return "destructive" as const;
  }

  if (riskLevel === "medium") {
    return "secondary" as const;
  }

  return "outline" as const;
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

export default function ApprovalsPage() {
  const [approvals, setApprovals] = useState<ApprovalRequest[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeRequestId, setActiveRequestId] = useState<string | null>(null);

  const selectedApproval = useMemo(
    () => approvals.find((approval) => approval.id === selectedId),
    [approvals, selectedId]
  );

  const loadApprovals = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      setApprovals(await listApprovals());
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load approvals."
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadApprovals();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadApprovals]);

  async function runApprovalAction(
    id: string,
    action: (id: string) => Promise<ApprovalRequest>
  ) {
    setActiveRequestId(id);
    setError(null);

    try {
      const updated = await action(id);
      setApprovals((current) =>
        current.map((approval) => (approval.id === id ? updated : approval))
      );
    } catch (actionError) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : "Approval action failed."
      );
    } finally {
      setActiveRequestId(null);
    }
  }

  async function createDemoApproval() {
    setActiveRequestId("demo");
    setError(null);

    try {
      const approval = await createDemoSendEmailApproval();
      setApprovals((current) => [approval, ...current]);
      setSelectedId(approval.id);
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : "Unable to create demo approval."
      );
    } finally {
      setActiveRequestId(null);
    }
  }

  return (
    <AppShell
      title="Approvals"
      description="Approval queue for risky actions before execution."
    >
      <div className="grid gap-4 xl:grid-cols-[1fr_22rem]">
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader className="flex-row items-start justify-between gap-4">
              <div>
                <CardTitle>Approval Queue</CardTitle>
                <CardDescription>
                  Risk-gated actions wait here before execution.
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button
                  aria-label="Refresh approvals"
                  disabled={isLoading}
                  onClick={() => void loadApprovals()}
                  size="icon"
                  type="button"
                  variant="outline"
                >
                  <RefreshCw aria-hidden className="size-4" />
                </Button>
                <Button
                  disabled={activeRequestId === "demo"}
                  onClick={() => void createDemoApproval()}
                  type="button"
                >
                  <ShieldCheck aria-hidden className="size-4" />
                  Demo send email
                </Button>
              </div>
            </CardHeader>
            {error ? (
              <CardContent>
                <div className="flex gap-3 rounded-lg border border-destructive bg-destructive/10 p-3 text-sm text-foreground">
                  <AlertTriangle aria-hidden className="mt-0.5 size-4 text-destructive" />
                  {error}
                </div>
              </CardContent>
            ) : null}
          </Card>

          {statusGroups.map((group) => {
            const Icon = group.icon;
            const groupApprovals = approvals.filter(
              (approval) => approval.status === group.value
            );

            return (
              <section className="flex flex-col gap-3" key={group.value}>
                <div className="flex items-center gap-2">
                  <Icon aria-hidden className="size-4 text-primary" />
                  <h2 className="text-base font-semibold text-foreground">
                    {group.label}
                  </h2>
                  <Badge variant="secondary">{groupApprovals.length}</Badge>
                </div>

                {groupApprovals.length ? (
                  <div className="grid gap-3 lg:grid-cols-2">
                    {groupApprovals.map((approval) => {
                      const isHighRisk =
                        approval.riskLevel === "high" ||
                        approval.riskLevel === "blocked";
                      const isActive = activeRequestId === approval.id;

                      return (
                        <Card
                          className={cn(
                            "cursor-pointer transition-colors",
                            selectedId === approval.id && "bg-secondary",
                            isHighRisk && "border-destructive"
                          )}
                          key={approval.id}
                          onClick={() => setSelectedId(approval.id)}
                        >
                          <CardHeader>
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <CardTitle className="text-base">
                                  {approval.summary}
                                </CardTitle>
                                <CardDescription>
                                  {approval.actionType}
                                </CardDescription>
                              </div>
                              <Badge variant={riskVariant(approval.riskLevel)}>
                                {approval.riskLevel}
                              </Badge>
                            </div>
                          </CardHeader>
                          <CardContent className="flex flex-col gap-3">
                            <div className="text-xs text-muted-foreground">
                              {formatTime(approval.createdAt)}
                            </div>
                            <pre className="max-h-28 overflow-auto rounded-md border border-border bg-background p-3 text-xs leading-5 text-muted-foreground">
                              {formatPreview(approval.payloadPreview)}
                            </pre>
                            {approval.status === "pending" ? (
                              <div className="flex justify-end gap-2">
                                <Button
                                  disabled={isActive}
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    void runApprovalAction(
                                      approval.id,
                                      approveApproval
                                    );
                                  }}
                                  size="sm"
                                  type="button"
                                >
                                  Approve
                                </Button>
                                <Button
                                  disabled={isActive}
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    void runApprovalAction(
                                      approval.id,
                                      (id) => rejectApproval(id, "Rejected in UI")
                                    );
                                  }}
                                  size="sm"
                                  type="button"
                                  variant="outline"
                                >
                                  Reject
                                </Button>
                              </div>
                            ) : null}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                ) : (
                  <Card>
                    <CardContent className="py-6 text-sm text-muted-foreground">
                      No {group.label.toLowerCase()} approvals.
                    </CardContent>
                  </Card>
                )}
              </section>
            );
          })}
        </div>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Details</CardTitle>
            <CardDescription>Selected approval request.</CardDescription>
          </CardHeader>
          <CardContent>
            {selectedApproval ? (
              <div className="flex flex-col gap-3 text-sm">
                <div>
                  <div className="text-xs text-muted-foreground">ID</div>
                  <div className="break-all font-medium text-foreground">
                    {selectedApproval.id}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Description</div>
                  <p className="mt-1 leading-6 text-foreground">
                    {selectedApproval.description || "No description."}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant={riskVariant(selectedApproval.riskLevel)}>
                    {selectedApproval.riskLevel}
                  </Badge>
                  <Badge variant="secondary">{selectedApproval.status}</Badge>
                </div>
                <pre className="max-h-72 overflow-auto rounded-md border border-border bg-background p-3 text-xs leading-5 text-muted-foreground">
                  {formatPreview({
                    payloadPreview: selectedApproval.payloadPreview,
                    metadata: selectedApproval.metadata,
                    requestedBy: selectedApproval.requestedBy,
                    approvedAt: selectedApproval.approvedAt,
                    rejectedAt: selectedApproval.rejectedAt,
                    completedAt: selectedApproval.completedAt,
                    errorMessage: selectedApproval.errorMessage
                  })}
                </pre>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">
                No approval selected.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
