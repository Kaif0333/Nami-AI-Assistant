import { AiTaskProfile } from "./ai-provider.types";

const codingPatterns = [
  /\b(code|coding|programming|programmer)\b/i,
  /\b(debug|bug|fix error|stack trace|exception|typescript|javascript|python|sql|prisma|nestjs|next\.?js|react|tauri|api endpoint)\b/i,
  /\b(refactor|implement|write tests?|unit tests?|e2e|lint|typecheck|build failure)\b/i,
  /\b(repo|repository|pull request|git diff|commit|function|class|component|schema|migration)\b/i
];

const reasoningPatterns = [
  /\b(reason|reasoning|think deeply|deep think|analyze|evaluate|compare|tradeoff|architecture|design decision)\b/i,
  /\b(plan|strategy|roadmap|break down|complex|heavy task|high task|hard problem)\b/i,
  /\b(security review|threat model|root cause|diagnose|decision)\b/i
];

const researchPatterns = [
  /\b(research|latest|current|up to date|web|source|sources|cite|citation|market|compare models?)\b/i,
  /\b(find out|look up|browse|internet|news|pricing|benchmark)\b/i
];

const localPatterns = [
  /\b(local only|private|offline|on device|ollama|do not send|keep local)\b/i
];

export function classifyAiTaskProfile(input: string): AiTaskProfile {
  const message = input.trim();

  if (matchesAny(message, localPatterns)) {
    return "local";
  }

  if (matchesAny(message, codingPatterns)) {
    return "coding";
  }

  if (matchesAny(message, researchPatterns)) {
    return "research";
  }

  if (matchesAny(message, reasoningPatterns)) {
    return "reasoning";
  }

  return "fast";
}

function matchesAny(input: string, patterns: RegExp[]) {
  return patterns.some((pattern) => pattern.test(input));
}
