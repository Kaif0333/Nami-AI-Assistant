import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const scanHistory = process.argv.includes("--history");
const findings = [];

const secretPatterns = [
  { kind: "openai-like", pattern: /sk-(proj-)?[A-Za-z0-9_-]{20,}/g },
  { kind: "github-like", pattern: /gh[pousr]_[A-Za-z0-9_]{20,}/g },
  { kind: "google-like", pattern: /AIza[0-9A-Za-z_-]{20,}/g },
  { kind: "slack-like", pattern: /xox[baprs]-[A-Za-z0-9-]{10,}/g },
  {
    kind: "jwt-like",
    pattern: /eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/g
  },
  {
    kind: "private-key-like",
    pattern: /-----BEGIN [A-Z ]+PRIVATE KEY-----/g
  }
];

const trackedFiles = git(["ls-files", "-z"])
  .split("\0")
  .filter(Boolean);

for (const file of trackedFiles) {
  scanTrackedFile(file, "HEAD");
}

if (scanHistory) {
  const commits = git(["rev-list", "--all"])
    .split(/\r?\n/)
    .filter(Boolean);

  for (const commit of commits) {
    scanCommit(commit);
  }
}

checkEnvFilesAreUntrackedAndIgnored();

if (findings.length > 0) {
  console.error("Secret check failed. Findings are metadata only; values are not printed.");
  for (const finding of uniqueFindings(findings)) {
    console.error(
      `- ${finding.location} ${finding.kind}${finding.name ? ` ${finding.name}` : ""}`
    );
  }
  process.exit(1);
}

console.log(
  scanHistory
    ? "Secret check passed for tracked files and Git history."
    : "Secret check passed for tracked files."
);

function scanTrackedFile(file, revision) {
  const fullPath = join(root, file);

  if (!existsSync(fullPath)) {
    return;
  }

  const buffer = readFileSync(fullPath);
  if (buffer.includes(0)) {
    return;
  }

  const content = buffer.toString("utf8");
  scanContent(content, `${revision}:${file}`);
}

function scanCommit(commit) {
  const files = git(["ls-tree", "-r", "--name-only", "-z", commit])
    .split("\0")
    .filter(Boolean);

  for (const file of files) {
    const show = spawnSync("git", ["show", `${commit}:${file}`], {
      cwd: root,
      encoding: "buffer",
      maxBuffer: 10 * 1024 * 1024
    });

    if (show.status !== 0 || show.stdout.includes(0)) {
      continue;
    }

    scanContent(show.stdout.toString("utf8"), `${commit.slice(0, 7)}:${file}`);
  }
}

function scanContent(content, locationPrefix) {
  const lines = content.split(/\r?\n/);

  for (const [index, line] of lines.entries()) {
    if (isKnownHistoricalTestSentinel(line, locationPrefix)) {
      continue;
    }

    for (const { kind, pattern } of secretPatterns) {
      pattern.lastIndex = 0;
      if (pattern.test(line)) {
        findings.push({
          location: `${locationPrefix}:${index + 1}`,
          kind,
          name: extractEnvName(line)
        });
      }
    }

    const envFinding = findUnsafeEnvAssignment(line);
    if (envFinding) {
      findings.push({
        location: `${locationPrefix}:${index + 1}`,
        kind: "secret-env-assignment",
        name: envFinding
      });
    }
  }
}

function isKnownHistoricalTestSentinel(line, locationPrefix) {
  if (!locationPrefix.endsWith("services/api/src/chat/chat.service.spec.ts")) {
    return false;
  }

  const historicalPrefix = "sk" + "-encoded-";

  return (
    line.includes(`"${historicalPrefix}title-secret-123456"`) ||
    line.includes(`"${historicalPrefix}warning-secret-123456"`)
  );
}

function findUnsafeEnvAssignment(line) {
  const match = line.match(
    /^\s*([A-Za-z_][A-Za-z0-9_]*(?:KEY|TOKEN|SECRET|PASSWORD)[A-Za-z0-9_]*)\s*=\s*(.*)$/
  );

  if (!match) {
    return null;
  }

  const [, name, rawValue] = match;
  const value = rawValue.trim().replace(/^["']|["']$/g, "");

  if (!value || value.startsWith("#")) {
    return null;
  }

  if (/^(your_|replace_|changeme|placeholder|example|todo)/i.test(value)) {
    return null;
  }

  return name;
}

function extractEnvName(line) {
  const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=/);
  return match?.[1] ?? "";
}

function checkEnvFilesAreUntrackedAndIgnored() {
  const trackedEnvFiles = git([
    "ls-files",
    "--",
    ".env",
    ".env.local",
    ".env.development",
    ".env.production",
    ".env.test",
    ".env.*.local"
  ])
    .split(/\r?\n/)
    .filter(Boolean);

  for (const file of trackedEnvFiles) {
    findings.push({
      location: file,
      kind: "tracked-env-file",
      name: ""
    });
  }

  if (existsSync(join(root, ".env.local"))) {
    const ignored = spawnSync("git", ["check-ignore", "-q", ".env.local"], {
      cwd: root
    });

    if (ignored.status !== 0) {
      findings.push({
        location: ".env.local",
        kind: "env-local-not-ignored",
        name: ""
      });
    }
  }
}

function uniqueFindings(items) {
  const seen = new Set();
  return items.filter((item) => {
    const key = `${item.location}|${item.kind}|${item.name}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function git(args) {
  return execFileSync("git", args, {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 50 * 1024 * 1024
  });
}
