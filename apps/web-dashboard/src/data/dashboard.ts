import type { LucideIcon } from "lucide-react";
import {
  Activity,
  BrainCircuit,
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
  Mic2,
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
  { title: "Voice", href: "/voice", icon: Mic2 },
  { title: "Memory", href: "/memory", icon: BrainCircuit },
  { title: "Tasks", href: "/tasks", icon: ListChecks },
  { title: "Projects", href: "/projects", icon: SquareTerminal },
  { title: "Automations", href: "/automations", icon: Workflow },
  { title: "Approvals", href: "/approvals", icon: ShieldCheck },
  { title: "Logs", href: "/logs", icon: Activity },
  { title: "Settings", href: "/settings", icon: KeyRound }
];

export const systemStats = [
  { label: "Build phase", value: "Phase 5", detail: "Push-to-talk voice" },
  { label: "Risk mode", value: "Gated", detail: "Approval queue persisted" },
  { label: "Runtime", value: "Local", detail: "API + dashboard" }
];

export const todayTasks = [
  {
    title: "Add database foundation",
    context: "Prisma + PostgreSQL",
    status: "In progress"
  },
  {
    title: "Create memory center",
    context: "Save/search memories",
    status: "Queued"
  },
  {
    title: "Prepare pgvector schema",
    context: "Semantic memory",
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
    status: "Approval required"
  },
  {
    action: "Submit form",
    risk: "High",
    status: "Approval gate required"
  },
  {
    action: "Run automation",
    risk: "Medium",
    status: "Safe preview only"
  }
];

export const logs = [
  {
    time: "14:42",
    event: "Phase 3 started",
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
    progress: "Phase 5",
    icon: Gauge
  },
  {
    name: "Agent runtime",
    health: "Planned",
    progress: "Phase 4+",
    icon: Bot
  },
  {
    name: "Memory service",
    health: "Active",
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
