import { readFile } from "node:fs/promises";
import { expect, type Page, test } from "@playwright/test";

const CLUBS = 14;

const startV2Career = async (page: Page) => {
  await page.goto("./");
  await page.getByTestId("engine-version").selectOption("2");
  await page.getByTestId("club-name").first().click();
  await page.getByTestId("start-career").click();
  await expect(page.getByTestId("career-hub")).toBeVisible();
};

const tableRows = async (page: Page): Promise<string[]> => {
  await page.getByTestId("nav-league").click();
  await expect(page.getByTestId(/^table-row-/)).toHaveCount(CLUBS);
  const rows = await page.getByTestId(/^table-row-/).allTextContents();
  await page.getByTestId("nav-hub").click();
  return rows;
};

test.describe("action engine (v2)", () => {
  test("quick-sims a matchday and updates the table @smoke", async ({ page }) => {
    await startV2Career(page);
    const before = await tableRows(page);
    await page.getByTestId("quick-sim").click();
    await expect(page.getByTestId("matchday-results")).toBeVisible();
    await page.getByTestId("results-continue").click();
    const after = await tableRows(page);
    expect(after).not.toEqual(before);
    await page.getByTestId("nav-league").click();
    const played = await page
      .locator("[data-testid^='table-row-'] td:nth-child(3)")
      .allTextContents();
    expect(played.every((p) => p === "1")).toBe(true);
  });

  test("plays a full match with changes, views and ratings, then reloads and exports", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await startV2Career(page);

    await page.getByTestId("play-match").click();
    await page.getByTestId("speed-4").click();

    await expect(page.getByTestId("view-toggle")).toBeVisible();
    await page.getByTestId("view-pitch").click();
    await expect(page.getByTestId("classic-pitch")).toBeVisible();
    const chain = page.getByTestId("chain-toggle");
    await expect(chain).toHaveAttribute("aria-pressed", "true");
    await chain.click();
    await expect(chain).toHaveAttribute("aria-pressed", "false");
    await chain.click();
    await expect(chain).toHaveAttribute("aria-pressed", "true");
    await page.getByTestId("view-momentum").click();
    await expect(page.getByTestId("classic-pitch")).toHaveCount(0);

    await expect(page.getByTestId("half-time")).toBeVisible({ timeout: 60_000 });
    await page.getByTestId("sub-add").click();
    await page.getByTestId("tactic-mentality").selectOption("attacking");
    await page.getByTestId("start-second-half").click();

    await expect(page.getByTestId("period")).toHaveText("Full time", { timeout: 90_000 });
    await expect(page.getByTestId("player-ratings")).toBeVisible();
    await expect(page.getByTestId("player-of-the-match")).toBeVisible();
    const score = await page.getByTestId("score").textContent();

    await page.getByTestId("continue").click();
    await expect(page.getByTestId("matchday-results")).toBeVisible();
    expect(await page.getByTestId(/^result-score-/).allTextContents()).toContain(score);
    await page.getByTestId("results-continue").click();
    await expect(page.getByTestId("career-hub")).toBeVisible();
    const table = await tableRows(page);

    await page.reload();
    await page.getByTestId("continue-career").click();
    await expect(page.getByTestId("career-hub")).toBeVisible();
    expect(await tableRows(page)).toEqual(table);
    // The next match is still on v2: the match screen offers the pitch view.
    await page.getByTestId("play-match").click();
    await expect(page.getByTestId("view-toggle")).toBeVisible();
    await page.getByTestId("nav-saves").click();

    await page.getByTestId("save-slot-1").click();
    const downloadPromise = page.waitForEvent("download");
    await page.getByTestId("export-slot-1").click();
    const path = await (await downloadPromise).path();
    const parsed: unknown = JSON.parse(await readFile(path, "utf8"));
    expect(parsed).toMatchObject({ game: { engineVersion: 2 } });

    await page.getByTestId("delete-slot-1").click();
    await page.getByTestId("confirm-yes").click();
    const chooserPromise = page.waitForEvent("filechooser");
    await page.getByTestId("import-file").click();
    await (await chooserPromise).setFiles(path);
    await page.getByTestId("import-into-slot-2").click();
    await page.getByTestId("load-slot-2").click();
    await expect(page.getByTestId("career-hub")).toBeVisible();
    expect(await tableRows(page)).toEqual(table);
  });
});
