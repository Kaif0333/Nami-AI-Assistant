import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig } from "prisma/config";

const fallbackDatabaseUrl =
  "postgresql://nami:nami@localhost:5432/nami?schema=public";

if (process.env.NAMI_SKIP_ENV_FILES !== "true") {
  for (const envPath of [
    resolve(process.cwd(), ".env.local"),
    resolve(process.cwd(), "..", "..", ".env.local")
  ]) {
    if (existsSync(envPath) && "loadEnvFile" in process) {
      process.loadEnvFile(envPath);
    }
  }
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations"
  },
  datasource: {
    url:
      process.env.DATABASE_DIRECT_URL ||
      process.env.DATABASE_URL ||
      fallbackDatabaseUrl
  }
});
