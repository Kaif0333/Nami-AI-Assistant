import { resolve } from "node:path";

export function getEnvFilePaths() {
  if (process.env.NAMI_SKIP_ENV_FILES === "true") {
    return [];
  }

  return [
    resolve(process.cwd(), ".env.local"),
    resolve(process.cwd(), ".env"),
    resolve(process.cwd(), "..", "..", ".env.local"),
    resolve(process.cwd(), "..", "..", ".env")
  ];
}
