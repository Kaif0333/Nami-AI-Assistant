import { KeyRound, ShieldCheck, SlidersHorizontal } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const settings = [
  {
    title: "API keys",
    description: "Status-only display. Raw secrets will never be shown.",
    status: "Not configured",
    icon: KeyRound
  },
  {
    title: "Safety",
    description: "Approval gates remain mandatory for risky actions.",
    status: "Enabled",
    icon: ShieldCheck
  },
  {
    title: "Models",
    description: "Model routing settings are planned for later phases.",
    status: "Planned",
    icon: SlidersHorizontal
  }
];

export default function SettingsPage() {
  return (
    <AppShell
      title="Settings"
      description="Configuration shell for future credentials, model routing, voice, n8n, safety, and memory settings."
    >
      <div className="grid gap-4 lg:grid-cols-3">
        {settings.map((setting) => {
          const Icon = setting.icon;

          return (
            <Card key={setting.title}>
              <CardHeader>
                <div className="mb-2 flex size-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <Icon aria-hidden className="size-5" />
                </div>
                <CardTitle>{setting.title}</CardTitle>
                <CardDescription>{setting.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Badge variant="secondary">{setting.status}</Badge>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </AppShell>
  );
}
