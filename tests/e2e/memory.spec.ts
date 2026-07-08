import { expect, test } from "@playwright/test";

test("memory page saves and displays a memory through the real API", async ({
  page,
  request
}) => {
  const title = `E2E memory ${Date.now()}`;
  const content = "Browser e2e memory content for Nami verification.";
  let createdId: string | undefined;

  try {
    await page.goto("/memory");

    await expect(page).toHaveTitle(/Nami/i);
    await expect(
      page.getByRole("heading", { exact: true, name: "Memory" })
    ).toBeVisible();
    await expect(page.getByText("Memory Center")).toBeVisible();

    await page.getByPlaceholder("Title").fill(title);
    await page.getByPlaceholder("What should Nami remember?").fill(content);
    await page.getByPlaceholder("Tags, comma separated").fill("e2e, memory");
    await page.getByRole("button", { name: /Save memory/i }).click();

    await expect(
      page.getByRole("heading", { exact: true, name: title }).first()
    ).toBeVisible();
    await expect(page.getByText(content).first()).toBeVisible();

    const response = await request.get(
      `http://localhost:4000/api/memories?query=${encodeURIComponent(title)}`
    );
    expect(response.ok()).toBe(true);

    const payload = (await response.json()) as MemoryListResponse;
    const created = payload.data.memories.find(
      (memory) => memory.title === title
    );
    expect(created).toBeTruthy();
    createdId = created?.id;
  } finally {
    const idsToDelete = new Set<string>();

    if (createdId) {
      idsToDelete.add(createdId);
    } else {
      const response = await request.get(
        `http://localhost:4000/api/memories?query=${encodeURIComponent(title)}`
      );

      if (response.ok()) {
        const payload = (await response.json()) as MemoryListResponse;
        for (const memory of payload.data.memories) {
          if (memory.title === title) {
            idsToDelete.add(memory.id);
          }
        }
      }
    }

    for (const id of idsToDelete) {
      await request.delete(`http://localhost:4000/api/memories/${id}`);
    }
  }
});

type MemoryListResponse = {
  data: {
    memories: Array<{
      id: string;
      title: string;
    }>;
  };
};
