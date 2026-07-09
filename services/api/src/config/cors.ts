const developmentWebOrigins = [
  "http://localhost:3000",
  "http://127.0.0.1:3000"
];

const developmentDesktopOrigins = [
  "http://tauri.localhost",
  "https://tauri.localhost",
  "tauri://localhost",
  "asset://localhost",
  "null"
];

export function resolveWebOrigins(webOriginConfig: string, appEnv: string) {
  const origins = webOriginConfig
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (appEnv !== "production") {
    origins.push(...developmentWebOrigins, ...developmentDesktopOrigins);
  }

  return [...new Set(origins)];
}

export function isAllowedCorsOrigin(
  origin: string | undefined,
  allowedOrigins: string[]
) {
  return !origin || allowedOrigins.includes(origin);
}
