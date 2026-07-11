import { BadRequestException } from "@nestjs/common";

import {
  RESEARCH_INVALID_REPORT_MESSAGE
} from "./research-provider.types";
import { ResearchReport } from "./research.types";

const sectionNames = [
  "Summary",
  "Key Findings",
  "Recommendations",
  "Risks",
  "Action Plan"
] as const;

type SectionName = (typeof sectionNames)[number];

export function parseResearchReport(markdown: string): ResearchReport {
  const sections = new Map<SectionName, string[]>();
  let activeSection: SectionName | undefined;

  for (const line of markdown.split(/\r?\n/)) {
    if (line.startsWith("## ")) {
      const heading = line.slice(3) as SectionName;
      activeSection = sectionNames.includes(heading) ? heading : undefined;

      if (activeSection && !sections.has(activeSection)) {
        sections.set(activeSection, []);
      }

      continue;
    }

    if (activeSection) {
      sections.get(activeSection)?.push(line);
    }
  }

  if (sectionNames.some((sectionName) => !sections.has(sectionName))) {
    throw invalidReport();
  }

  const report = {
    summary: sectionText(sections, "Summary"),
    keyFindings: sectionItems(sections, "Key Findings"),
    recommendations: sectionItems(sections, "Recommendations"),
    risks: sectionItems(sections, "Risks"),
    actionPlan: sectionItems(sections, "Action Plan")
  };

  if (
    !report.summary ||
    report.keyFindings.length === 0 ||
    report.recommendations.length === 0 ||
    report.risks.length === 0 ||
    report.actionPlan.length === 0
  ) {
    throw invalidReport();
  }

  return report;
}

function sectionText(sections: Map<SectionName, string[]>, name: SectionName) {
  return (sections.get(name) ?? []).join("\n").trim();
}

function sectionItems(sections: Map<SectionName, string[]>, name: SectionName) {
  return (sections.get(name) ?? [])
    .map((line) => line.trim())
    .map((line) => line.replace(/^(?:[-*+]\s*|\d+[.)]\s*)/, "").trim())
    .filter(Boolean);
}

function invalidReport() {
  return new BadRequestException({
    code: "RESEARCH_INVALID_REPORT",
    message: RESEARCH_INVALID_REPORT_MESSAGE,
    details: {}
  });
}
