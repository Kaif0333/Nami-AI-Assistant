import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const failures = [];

const requiredDirs = [
  "apps/desktop",
  "apps/web-dashboard",
  "services/api",
  "services/agent-runtime",
  "services/memory-service",
  "services/voice-service",
  "services/automation-bridge",
  "services/research-service",
  "services/browser-agent",
  "services/computer-agent",
  "services/document-agent",
  "packages/ui",
  "packages/types",
  "packages/shared",
  "packages/prompts",
  "packages/security",
  "packages/config",
  "docs",
  "scripts",
  "docker",
  "tests/unit",
  "tests/integration",
  "tests/e2e"
];

const requiredFiles = [
  ".env.example",
  ".gitignore",
  "AGENTS.md",
  "CODEX_START_HERE.md",
  "DOCUMENT_INDEX.md",
  "FINAL_DOCUMENT_MANIFEST.md",
  "MASTER_CODEX_PROMPT.md",
  "README.md",
  "WHAT_TO_GIVE_CODEX.md",
  "package.json",
  "pnpm-workspace.yaml"
];

for (const dir of requiredDirs) {
  if (!existsSync(join(root, dir))) {
    failures.push(`Missing directory: ${dir}`);
  }
}

for (const file of requiredFiles) {
  if (!existsSync(join(root, file))) {
    failures.push(`Missing file: ${file}`);
  }
}

const gitignore = readFileSync(join(root, ".gitignore"), "utf8");
if (!gitignore.includes(".env.local")) {
  failures.push(".gitignore must ignore .env.local");
}

if (existsSync(join(root, ".env.local"))) {
  failures.push(".env.local must not exist in the repository");
}

const workspace = readFileSync(join(root, "pnpm-workspace.yaml"), "utf8");
for (const pattern of ['"apps/*"', '"services/*"', '"packages/*"']) {
  if (!workspace.includes(pattern)) {
    failures.push(`pnpm workspace is missing ${pattern}`);
  }
}

const envExample = readFileSync(join(root, ".env.example"), "utf8");
const forbiddenSecretPatterns = [
  /sk-[A-Za-z0-9_-]{10,}/,
  /ghp_[A-Za-z0-9_]{10,}/,
  /xox[baprs]-[A-Za-z0-9-]{10,}/,
  /-----BEGIN [A-Z ]+PRIVATE KEY-----/
];

for (const pattern of forbiddenSecretPatterns) {
  if (pattern.test(envExample)) {
    failures.push(`.env.example appears to contain a secret matching ${pattern}`);
  }
}

const secretLikeKeys = new Set([
  "OPENAI_API_KEY",
  "DATABASE_URL",
  "SUPABASE_URL",
  "SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "N8N_WEBHOOK_SECRET",
  "N8N_TEST_WEBHOOK_URL",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "GITHUB_TOKEN",
  "ELEVENLABS_API_KEY",
  "WEATHER_API_KEY",
  "SEARCH_API_KEY",
  "LOCAL_ENCRYPTION_KEY",
  "JWT_SECRET"
]);

for (const line of envExample.split(/\r?\n/)) {
  const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (!match) {
    continue;
  }

  const [, key, value] = match;
  if (secretLikeKeys.has(key) && value.trim() !== "") {
    failures.push(`.env.example secret-like key must be empty: ${key}`);
  }
}

if (failures.length > 0) {
  console.error("Phase 0 foundation check failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Phase 0 foundation check passed.");
