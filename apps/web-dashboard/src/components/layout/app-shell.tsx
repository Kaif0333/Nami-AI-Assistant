import { Bell, CircleHelp, Command, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { systemStats } from "@/data/dashboard";

type AppShellProps = {
  title: string;
  description: string;
  children: React.ReactNode;
};

export function AppShell({ title, description, children }: AppShellProps) {
  return (
    <div className="min-h-screen">
      <div className="mx-auto flex min-h-screen w-full max-w-[1600px]">
        <aside className="hidden w-72 shrink-0 border-r border-border bg-background/64 px-4 py-5 backdrop-blur md:block">
          <div className="flex items-center gap-3 px-2">
            <div className="flex size-10 items-center justify-center rounded-lg border border-primary/35 bg-primary/10">
              <Command aria-hidden className="size-5 text-primary" />
            </div>
            <div>
              <div className="text-sm font-semibold text-foreground">Nami</div>
              <div className="text-xs text-muted-foreground">AI Command OS</div>
            </div>
          </div>
          <Separator className="my-5" />
          <SidebarNav />
          <div className="mt-6 rounded-lg border border-border bg-card/70 p-3">
            <div className="flex items-center gap-2 text-xs font-medium text-primary">
              <ShieldCheck aria-hidden className="size-4" />
              Safe build mode
            </div>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              Phase 5 active. Voice remains push-to-talk only; external
              automation remains gated.
            </p>
          </div>
        </aside>

        <main className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-10 border-b border-border bg-background/82 px-4 py-4 backdrop-blur xl:px-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h1 className="text-2xl font-semibold tracking-normal text-foreground">
                  {title}
                </h1>
                <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
                  {description}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="outline" size="sm">
                  <CircleHelp data-icon="inline-start" aria-hidden />
                  Phase guide
                </Button>
                <Button variant="secondary" size="sm">
                  <Bell data-icon="inline-start" aria-hidden />
                  No alerts
                </Button>
              </div>
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              {systemStats.map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-lg border border-border bg-card/60 px-3 py-2"
                >
                  <div className="text-xs text-muted-foreground">{stat.label}</div>
                  <div className="mt-1 flex items-baseline justify-between gap-3">
                    <span className="text-sm font-semibold text-foreground">
                      {stat.value}
                    </span>
                    <span className="truncate text-xs text-muted-foreground">
                      {stat.detail}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </header>
          <div className="p-4 xl:p-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
