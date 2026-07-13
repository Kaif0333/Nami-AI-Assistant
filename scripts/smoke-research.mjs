import { isIP } from "node:net";

const apiBaseUrl = (process.env.NAMI_API_URL || "http://localhost:4000").replace(
  /\/+$/,
  ""
);
const researchUrl = `${apiBaseUrl}/api/research`;
const expectedProvider = "gemini";
const expectedModel = process.env.RESEARCH_SEARCH_MODEL || "gemini-2.5-flash";

try {
  const response = await fetch(researchUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query: "What is the current Node.js LTS release schedule? Use official sources.",
      mode: "fast"
    }),
    signal: AbortSignal.timeout(90_000)
  });

  if (!response.ok) {
    const detail = await readErrorDetail(response);
    throw new Error(
      `research request returned HTTP ${response.status}${detail ? ` (${detail})` : ""}`
    );
  }

  const payload = await response.json();

  if (!payload || payload.success !== true || !payload.data) {
    throw new Error("research response did not contain a success envelope");
  }

  const run = payload.data;
  const sourceCount = Array.isArray(run.sources) ? run.sources.length : 0;

  if (!["completed", "partial"].includes(run.status)) {
    throw new Error(`research returned unexpected status ${String(run.status)}`);
  }

  if (sourceCount < 1) {
    throw new Error("research returned no sources");
  }

  if (typeof run.id !== "string") {
    throw new Error("research response did not contain run metadata");
  }

  if (run.provider !== expectedProvider || run.model !== expectedModel) {
    throw new Error("research did not use the expected Gemini provider route");
  }

  if (!run.sources.some(isValidPublicSource)) {
    throw new Error("research returned no valid public sources");
  }

  console.log(`provider=${run.provider} model=${run.model} source-count=${sourceCount}`);
} catch (error) {
  const message = error instanceof Error ? error.message : "unknown error";
  console.error(`research smoke failed: ${message}`);
  process.exitCode = 1;
}

function isValidPublicSource(source) {
  if (!source || typeof source !== "object") {
    return false;
  }

  if (
    typeof source.url !== "string" ||
    typeof source.domain !== "string" ||
    typeof source.title !== "string"
  ) {
    return false;
  }

  try {
    const url = new URL(source.url);
    const hostname = url.hostname.toLowerCase();
    const domain = source.domain.toLowerCase();
    const unbracketedHostname =
      hostname.startsWith("[") && hostname.endsWith("]")
        ? hostname.slice(1, -1)
        : hostname;

    if (!["http:", "https:"].includes(url.protocol)) {
      return false;
    }

    if (url.username || url.password) {
      return false;
    }

    if (isIP(unbracketedHostname) !== 0) {
      return false;
    }

    if (hostname !== domain) {
      return false;
    }

    if (hostname === "localhost" || hostname.endsWith(".localhost")) {
      return false;
    }
  } catch {
    return false;
  }

  return source.title.trim().length > 0 && source.domain.trim().length > 0;
}

async function readErrorDetail(response) {
  const contentType = response.headers.get("content-type") || "";

  if (!contentType.includes("application/json")) {
    return "";
  }

  try {
    const payload = await response.json();
    const error = payload?.error;
    const code = typeof error?.code === "string" ? error.code : "";
    const message = typeof error?.message === "string" ? error.message : "";

    return [code, message].filter(Boolean).join(": ");
  } catch {
    return "";
  }
}
