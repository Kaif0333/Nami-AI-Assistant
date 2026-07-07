import { resolve } from "node:path";

export function getEnvFilePaths() {
  return [
    resolve(process.cwd(), ".env.local"),
    resolve(process.cwd(), ".env"),
    resolve(process.cwd(), "..", "..", ".env.local"),
    resolve(process.cwd(), "..", "..", ".env")
  ];
}
