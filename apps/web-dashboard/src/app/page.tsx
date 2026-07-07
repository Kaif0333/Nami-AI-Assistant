import { ArrowRight, Mic, ShieldAlert } from "lucide-react";

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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import {
  approvals,
  automations,
  logs,
  projects,
  safetyChecklist,
  todayTasks
} from "@/data/dashboard";

export default function HomePage() {
  return (
    <AppShell
      title="Home Command Center"
      description="The Phase 1 dashboard shell for Nami. It is visual and local only, with advanced modules intentionally locked."
    >
      <div className="grid gap-4 xl:grid-cols-[1.45fr_0.95fr]">
        <section className="flex flex-col gap-4">
          <Card className="overflow-hidden">
            <CardHeader className="pb-4">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <CardTitle className="text-xl">Nami is in safe build mode</CardTitle>
                  <CardDescription>
                    Dashboard UI is ready for navigation, approvals, logs, and status
                    surfaces. Live AI tools are not connected yet.
                  </CardDescription>
                </div>
                <Badge variant="secondary">Phase 1</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-5 lg:grid-cols-[15rem_1fr]">
                <div className="flex items-center justify-center">
                  <div className="voice-orb relative size-44 rounded-full">
                    <div className="absolute inset-8 rounded-full border border-white/20" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Mic aria-hidden className="size-10 text-background" />
                    </div>
                  </div>
                </div>
                <div className="flex flex-col justify-center gap-4">
                  <label className="text-sm font-medium text-foreground" htmlFor="quick-command">
                    Quick command
                  </label>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Input
                      id="quick-command"
                      placeholder="Ask Nami to plan, draft, research, or prepare an action..."
                      aria-label="Quick command"
                    />
                    <Button type="button">
                      <ArrowRight data-icon="inline-end" aria-hidden />
                      Queue
                    </Button>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {safetyChecklist.map((item) => {
                      const Icon = item.icon;

                      return (
                        <div
                          key={item.label}
                          className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground"
                        >
                          <Icon aria-hidden className="size-4 text-primary" />
                          <span>{item.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Today&apos;s Tasks</CardTitle>
                <CardDescription>Local planning placeholders for Phase 1.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                {todayTasks.map((task) => (
                  <div
                    key={task.title}
                    className="rounded-lg border border-border bg-muted/30 p-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-medium text-foreground">
                        {task.title}
                      </span>
                      <Badge variant="outline">{task.status}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{task.context}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Pending Approvals</CardTitle>
                <CardDescription>Risk gates are visible before execution exists.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                {approvals.map((approval) => (
                  <div
                    key={approval.action}
                    className="rounded-lg border border-border bg-muted/30 p-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <ShieldAlert aria-hidden className="size-4 text-primary" />
                        <span className="text-sm font-medium text-foreground">
                          {approval.action}
                        </span>
                      </div>
                      <Badge variant={approval.risk === "High" ? "destructive" : "secondary"}>
                        {approval.risk}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{approval.status}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Active Automations</CardTitle>
              <CardDescription>n8n workflows are planned, not connected.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {automations.map((automation) => (
                <div
                  key={automation.name}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 p-3"
                >
                  <div>
                    <div className="text-sm font-medium text-foreground">
                      {automation.name}
                    </div>
                    <div className="text-sm text-muted-foreground">{automation.detail}</div>
                  </div>
                  <Badge variant="secondary">{automation.state}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Project Status</CardTitle>
              <CardDescription>Major Nami modules by roadmap phase.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              {projects.map((project) => {
                const Icon = project.icon;

                return (
                  <div
                    key={project.name}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 p-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex size-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                        <Icon aria-hidden className="size-4" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-foreground">
                          {project.name}
                        </div>
                        <div className="text-sm text-muted-foreground">{project.progress}</div>
                      </div>
                    </div>
                    <Badge variant="outline">{project.health}</Badge>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Logs</CardTitle>
              <CardDescription>Static activity surface for future audit logs.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Event</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={`${log.time}-${log.event}`}>
                      <TableCell className="text-muted-foreground">{log.time}</TableCell>
                      <TableCell>
                        <div className="font-medium text-foreground">{log.event}</div>
                        <div className="text-xs text-muted-foreground">{log.source}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{log.status}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </section>
      </div>
    </AppShell>
  );
}
