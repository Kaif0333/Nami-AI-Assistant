import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { todayTasks } from "@/data/dashboard";

export default function TasksPage() {
  return (
    <AppShell
      title="Tasks"
      description="A task workspace placeholder for Kaif's future daily command center."
    >
      <div className="grid gap-4 lg:grid-cols-3">
        {todayTasks.map((task) => (
          <Card key={task.title}>
            <CardHeader>
              <CardTitle>{task.title}</CardTitle>
              <CardDescription>{task.context}</CardDescription>
            </CardHeader>
            <CardContent>
              <Badge variant="secondary">{task.status}</Badge>
            </CardContent>
          </Card>
        ))}
      </div>
    </AppShell>
  );
}
