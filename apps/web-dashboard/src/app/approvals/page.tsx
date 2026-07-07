import { ShieldCheck } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { approvals } from "@/data/dashboard";

export default function ApprovalsPage() {
  return (
    <AppShell
      title="Approvals"
      description="Risk review cards for the future approval engine. All actions stay disabled in Phase 1."
    >
      <div className="grid gap-4 lg:grid-cols-3">
        {approvals.map((approval) => (
          <Card key={approval.action}>
            <CardHeader>
              <div className="mb-2 flex size-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                <ShieldCheck aria-hidden className="size-5" />
              </div>
              <CardTitle>{approval.action}</CardTitle>
              <CardDescription>{approval.status}</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-between gap-3">
              <Badge variant={approval.risk === "High" ? "destructive" : "secondary"}>
                {approval.risk}
              </Badge>
              <Button disabled variant="outline" size="sm">
                Locked
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </AppShell>
  );
}
