import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { projects } from "@/data/dashboard";

export default function ProjectsPage() {
  return (
    <AppShell
      title="Projects"
      description="Project status cards for Nami modules and Kaif's future client/software work."
    >
      <div className="grid gap-4 lg:grid-cols-3">
        {projects.map((project) => {
          const Icon = project.icon;

          return (
            <Card key={project.name}>
              <CardHeader>
                <div className="mb-2 flex size-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <Icon aria-hidden className="size-5" />
                </div>
                <CardTitle>{project.name}</CardTitle>
                <CardDescription>{project.progress}</CardDescription>
              </CardHeader>
              <CardContent>
                <Badge variant="outline">{project.health}</Badge>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </AppShell>
  );
}
