import type { LucideIcon } from "lucide-react";
import {
  Activity,
  Bot,
  CalendarCheck,
  CheckCircle2,
  ClipboardList,
  FileText,
  Gauge,
  Home,
  KeyRound,
  ListChecks,
  Mail,
  MessageSquareText,
  Network,
  RadioTower,
  ShieldCheck,
  Sparkles,
  SquareTerminal,
  Workflow
} from "lucide-react";

export type NavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
};

export const navItems: NavItem[] = [
  { title: "Home", href: "/", icon: Home },
  { title: "Chat", href: "/chat", icon: MessageSquareText },
  { title: "Tasks", href: "/tasks", icon: ListChecks },
  { title: "Projects", href: "/projects", icon: SquareTerminal },
  { title: "Automations", href: "/automations", icon: Workflow },
  { title: "Approvals", href: "/approvals", icon: ShieldCheck },
  { title: "Logs", href: "/logs", icon: Activity },
  { title: "Settings", href: "/settings", icon: KeyRound }
];

export const systemStats = [
  { label: "Build phase", value: "Phase 1", detail: "Dashboard shell" },
  { label: "Risk mode", value: "Safe", detail: "Approvals locked" },
  { label: "Runtime", value: "Local", detail: "No live agents" }
];

export const todayTasks = [
  {
    title: "Finish dashboard shell",
    context: "Tauri + Next.js structure",
    status: "In progress"
  },
  {
    title: "Prepare approval UI",
    context: "Static cards only",
    status: "Queued"
  },
  {
    title: "Document Phase 1 checks",
    context: "Changelog and report",
    status: "Queued"
  }
];

export const automations = [
  {
    name: "Daily briefing",
    state: "Planned",
    detail: "n8n hook comes later"
  },
  {
    name: "Job email tracker",
    state: "Locked",
    detail: "Requires approvals"
  },
  {
    name: "Client follow-up",
    state: "Planned",
    detail: "Draft-only first"
  }
];

export const approvals = [
  {
    action: "Send email",
    risk: "High",
    status: "Disabled until Phase 3"
  },
  {
    action: "Submit form",
    risk: "High",
    status: "Approval gate required"
  },
  {
    action: "Run automation",
    risk: "Medium",
    status: "Mock preview only"
  }
];

export const logs = [
  {
    time: "14:42",
    event: "Phase 1 started",
    source: "Codex",
    status: "ok"
  },
  {
    time: "14:40",
    event: "Foundation verified",
    source: "check-foundation",
    status: "ok"
  },
  {
    time: "14:36",
    event: "Docs copied",
    source: "Phase 0",
    status: "ok"
  }
];

export const projects = [
  {
    name: "Nami dashboard",
    health: "Active",
    progress: "Phase 1",
    icon: Gauge
  },
  {
    name: "Agent runtime",
    health: "Planned",
    progress: "Phase 2+",
    icon: Bot
  },
  {
    name: "Memory service",
    health: "Planned",
    progress: "Phase 4",
    icon: Network
  }
];

export const featureRows = [
  {
    title: "Voice console",
    owner: "Voice service",
    phase: "Phase 5",
    icon: RadioTower
  },
  {
    title: "Email and calendar",
    owner: "Approval gated",
    phase: "Phase 9",
    icon: Mail
  },
  {
    title: "Documents",
    owner: "Document agent",
    phase: "Phase 10",
    icon: FileText
  },
  {
    title: "Scheduling",
    owner: "Calendar agent",
    phase: "Phase 9",
    icon: CalendarCheck
  }
];

export const safetyChecklist = [
  {
    label: "No real secrets in Git",
    icon: CheckCircle2
  },
  {
    label: "Risky actions require approval",
    icon: ShieldCheck
  },
  {
    label: "Advanced modules stay disabled",
    icon: ClipboardList
  },
  {
    label: "Nami identity stays canonical",
    icon: Sparkles
  }
];
