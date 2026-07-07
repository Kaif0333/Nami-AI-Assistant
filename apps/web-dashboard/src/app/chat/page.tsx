import { Bot, UserRound } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const messages = [
  {
    role: "Nami",
    text: "Chat UI shell is ready. The AI brain will connect in Phase 2."
  },
  {
    role: "Kaif",
    text: "Keep advanced tools locked until approvals and logs exist."
  }
];

export default function ChatPage() {
  return (
    <AppShell
      title="Chat"
      description="A visual chat workspace prepared for the Phase 2 API and basic AI response flow."
    >
      <div className="grid min-h-[34rem] gap-4 xl:grid-cols-[18rem_1fr_20rem]">
        <Card>
          <CardHeader>
            <CardTitle>Conversations</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {["Nami build plan", "Dashboard notes", "Safety policy"].map((item) => (
              <button
                key={item}
                className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-accent"
                type="button"
              >
                {item}
              </button>
            ))}
          </CardContent>
        </Card>

        <Card className="flex flex-col">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Nami conversation</CardTitle>
            <Badge variant="secondary">Local mock</Badge>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col gap-4">
            <div className="flex flex-1 flex-col gap-3">
              {messages.map((message) => {
                const Icon = message.role === "Nami" ? Bot : UserRound;

                return (
                  <div
                    key={message.text}
                    className="flex gap-3 rounded-lg border border-border bg-muted/30 p-3"
                  >
                    <div className="flex size-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                      <Icon aria-hidden className="size-4" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-foreground">
                        {message.role}
                      </div>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">
                        {message.text}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input placeholder="Type a message for the future Nami API..." />
              <Button disabled>Send later</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tool Timeline</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm text-muted-foreground">
            <p>No tools are connected in Phase 1.</p>
            <p>Future calls will appear here with status, risk, and approval state.</p>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
