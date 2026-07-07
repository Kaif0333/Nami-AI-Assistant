import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { automations } from "@/data/dashboard";

export default function AutomationsPage() {
  return (
    <AppShell
      title="Automations"
      description="n8n automation planning surface. Real webhooks are intentionally deferred."
    >
      <div className="grid gap-4 lg:grid-cols-3">
        {automations.map((automation) => (
          <Card key={automation.name}>
            <CardHeader>
              <CardTitle>{automation.name}</CardTitle>
              <CardDescription>{automation.detail}</CardDescription>
            </CardHeader>
            <CardContent>
              <Badge variant="secondary">{automation.state}</Badge>
            </CardContent>
          </Card>
        ))}
      </div>
    </AppShell>
  );
}
