import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  expect: {
    timeout: 10_000
  },
  fullyParallel: false,
  reporter: "line",
  use: {
    baseURL: "http://localhost:3000",
    screenshot: "only-on-failure",
    trace: "retain-on-failure"
  },
  webServer: [
    {
      command: "node services/api/dist/main.js",
      reuseExistingServer: false,
      timeout: 60_000,
      url: "http://localhost:4000/api/health"
    },
    {
      command: "corepack pnpm exec serve apps/web-dashboard/out -l 3000",
      reuseExistingServer: false,
      timeout: 60_000,
      url: "http://localhost:3000"
    }
  ],
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] }
    }
  ]
});
