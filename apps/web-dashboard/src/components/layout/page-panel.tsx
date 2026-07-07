import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type PagePanelProps = {
  title: string;
  description: string;
  children: React.ReactNode;
};

export function PagePanel({ title, description, children }: PagePanelProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
