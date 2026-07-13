import { expect, test } from "@playwright/test";

const apiBaseUrl = "http://localhost:4000/api";
const submittedQuery = "What are the current stable Node.js releases?";
const historicalQuery = "Previous research on Nami AI Assistant updates";
const sourceUrl = "https://nodejs.org/en/about/previous-releases";

test("research page submits a deep report and opens recent history", async ({
  page
}) => {
  const submittedRun = createResearchRun({
    id: "research-current-run",
    query: submittedQuery,
    mode: "deep",
    summary: "Current Node.js releases are published on the official release schedule."
  });
  const historicalRun = createResearchRun({
    id: "research-history-run",
    query: historicalQuery,
    mode: "fast",
    summary: "Historical report summary for recent Nami updates."
  });

  await page.route(`${apiBaseUrl}/research**`, async (route) => {
    const request = route.request();
    const url = new URL(request.url());

    if (request.method() === "GET" && url.pathname === "/api/research/status") {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            provider: "gemini",
            configured: true,
            model: "gemini-2.5-flash",
            supportedModes: ["fast", "deep"],
            supportsUrlContext: true,
            maxUrls: 5,
            requestTimeoutMs: 30000
          }
        })
      });
      return;
    }

    if (request.method() === "GET" && url.pathname === "/api/research") {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: { researchRuns: [historicalRun] }
        })
      });
      return;
    }

    if (request.method() === "POST" && url.pathname === "/api/research") {
      expect(request.postDataJSON()).toEqual({
        query: submittedQuery,
        mode: "deep",
        urls: [sourceUrl]
      });

      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: submittedRun })
      });
      return;
    }

    if (
      request.method() === "GET" &&
      url.pathname === `/api/research/${historicalRun.id}`
    ) {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: historicalRun })
      });
      return;
    }

    await route.fallback();
  });

  await page.goto("/research");

  await expect(
    page.getByRole("heading", { exact: true, name: "Research" })
  ).toBeVisible();
  await expect(page.getByText("gemini", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { exact: true, name: "deep" })).toHaveAttribute(
    "aria-pressed",
    "false"
  );

  await page.getByRole("button", { exact: true, name: "deep" }).click();
  await expect(page.getByRole("button", { exact: true, name: "deep" })).toHaveAttribute(
    "aria-pressed",
    "true"
  );
  await page.getByPlaceholder("What should Nami investigate?").fill(submittedQuery);
  await page.getByPlaceholder("https://example.com").fill(sourceUrl);

  await page.getByRole("button", { name: "Start research" }).click();

  await expect(page.getByText("completed", { exact: true }).first()).toBeVisible();
  await expect(page.getByText(submittedRun.summary)).toBeVisible();
  for (const section of [
    "Summary",
    "Key findings",
    "Recommendations",
    "Risks",
    "Action plan",
    "Sources"
  ]) {
    await expect(
      page.getByRole("heading", { exact: true, name: section })
    ).toBeVisible();
  }
  await expect(
    page.getByRole("link", { exact: true, name: "Node.js release schedule" })
  ).toHaveAttribute("href", sourceUrl);

  await page
    .getByRole("button", { exact: true, name: new RegExp(historicalQuery) })
    .click();

  await expect(page.getByText(historicalRun.summary)).toBeVisible();
  await expect(
    page.getByText(historicalQuery, { exact: true }).first()
  ).toBeVisible();
});

function createResearchRun(input: {
  id: string;
  query: string;
  mode: "fast" | "deep";
  summary: string;
}) {
  const timestamp = "2026-07-12T12:00:00.000Z";

  return {
    id: input.id,
    query: input.query,
    mode: input.mode,
    status: "completed",
    summary: input.summary,
    keyFindings: ["Official release information is available from Node.js."],
    recommendations: ["Use the official release schedule for upgrade planning."],
    risks: ["Release schedules can change as maintenance windows close."],
    actionPlan: ["Review the current LTS schedule before selecting a runtime."],
    provider: "gemini",
    model: "gemini-2.5-flash",
    searchQueries: [input.query],
    warnings: [],
    errorMessage: null,
    startedAt: timestamp,
    completedAt: timestamp,
    createdAt: timestamp,
    updatedAt: timestamp,
    sources: [
      {
        id: `${input.id}-source-1`,
        url: sourceUrl,
        title: "Node.js release schedule",
        domain: "nodejs.org",
        snippet: "Official Node.js release schedule and support information.",
        publishedAt: null,
        retrievedAt: timestamp,
        sourceType: "web"
      }
    ]
  };
}
