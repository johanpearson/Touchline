import { readFile } from "node:fs/promises";
import { expect, type Page, test } from "@playwright/test";

const CLUBS = 14;

type Snapshot = { club: string; matchday: string; table: string[] };

const startCareer = async (page: Page): Promise<string> => {
  await page.goto("./");
  const first = page.getByTestId("club-name").first();
  const club = (await first.textContent()) ?? "";
  await first.click();
  await page.getByTestId("start-career").click();
  await expect(page.getByTestId("career-hub")).toBeVisible();
  return club;
};

const quickSimMatchdays = async (page: Page, count: number) => {
  for (let i = 0; i < count; i++) {
    await page.getByTestId("quick-sim").click();
    await page.getByTestId("results-continue").click();
    await expect(page.getByTestId("career-hub")).toBeVisible();
  }
};

const snapshot = async (page: Page): Promise<Snapshot> => {
  await expect(page.getByTestId("career-hub")).toBeVisible();
  const club = (await page.getByTestId("hub-club-name").textContent()) ?? "";
  const matchday = (await page.getByTestId("next-match-matchday").textContent()) ?? "";
  await page.getByTestId("nav-league").click();
  await expect(page.getByTestId(/^table-row-/)).toHaveCount(CLUBS);
  const table = await page.getByTestId(/^table-row-/).allTextContents();
  await page.getByTestId("nav-hub").click();
  return { club, matchday, table };
};

const openSaves = async (page: Page) => {
  await page.getByTestId("nav-saves").click();
  await expect(page.getByTestId("saves-screen")).toBeVisible();
};

test.describe("persistence", () => {
  test("continues the career after a reload @smoke", async ({ page }) => {
    const club = await startCareer(page);
    await quickSimMatchdays(page, 2);
    const before = await snapshot(page);
    expect(before.club).toBe(club);

    await page.reload();
    await expect(page.getByTestId("continue-career")).toContainText(club);
    await expect(page.getByTestId("continue-career")).toContainText(
      before.matchday.replace(/\D+/g, ""),
    );
    await page.getByTestId("continue-career").click();

    expect(await snapshot(page)).toEqual(before);

    await page.getByTestId("nav-league").click();
    await expect(page.getByTestId(/^table-row-/)).toHaveCount(CLUBS);
    const played = await page
      .locator("[data-testid^='table-row-'] td:nth-child(3)")
      .allTextContents();
    expect(played).toHaveLength(CLUBS);
    expect(played.every((p) => p === "2")).toBe(true);
  });

  test("saves to a slot and loads it again", async ({ page }) => {
    await startCareer(page);
    await quickSimMatchdays(page, 1);
    const saved = await snapshot(page);

    await openSaves(page);
    await page.getByTestId("save-slot-1").click();
    await expect(page.getByTestId("slot-info-slot-1")).toContainText(saved.club);

    await page.getByTestId("nav-hub").click();
    await quickSimMatchdays(page, 1);
    expect((await snapshot(page)).matchday).not.toBe(saved.matchday);

    await openSaves(page);
    await page.getByTestId("load-slot-1").click();
    expect(await snapshot(page)).toEqual(saved);
  });

  test("exports a slot and imports the file into another slot", async ({ page }) => {
    await startCareer(page);
    await quickSimMatchdays(page, 1);
    const saved = await snapshot(page);

    await openSaves(page);
    await page.getByTestId("save-slot-1").click();
    await expect(page.getByTestId("slot-info-slot-1")).toContainText(saved.club);

    const downloadPromise = page.waitForEvent("download");
    await page.getByTestId("export-slot-1").click();
    const download = await downloadPromise;
    const path = await download.path();
    const parsed: unknown = JSON.parse(await readFile(path, "utf8"));
    expect(parsed).toMatchObject({ schemaVersion: expect.any(Number) });

    await page.getByTestId("delete-slot-1").click();
    await page.getByTestId("confirm-yes").click();
    await expect(page.getByTestId("slot-info-slot-1")).not.toContainText(saved.club);

    const chooserPromise = page.waitForEvent("filechooser");
    await page.getByTestId("import-file").click();
    await (await chooserPromise).setFiles(path);
    await page.getByTestId("import-into-slot-2").click();
    await expect(page.getByTestId("slot-info-slot-2")).toContainText(saved.club);

    await page.getByTestId("load-slot-2").click();
    expect(await snapshot(page)).toEqual(saved);
  });

  test("rejects a garbage file and stores nothing", async ({ page }) => {
    await page.goto("./");
    await page.getByTestId("nav-saves").click();
    await expect(page.getByTestId("saves-screen")).toBeVisible();

    const chooserPromise = page.waitForEvent("filechooser");
    await page.getByTestId("import-file").click();
    await (await chooserPromise).setFiles({
      name: "garbage.json",
      mimeType: "application/json",
      buffer: Buffer.from("this is not a save"),
    });

    await expect(page.getByTestId("import-error")).toBeVisible();
    await expect(page.getByTestId("import-picker")).toHaveCount(0);
    await expect(page.getByTestId("slot-info-slot-1")).toContainText(/empty/i);
    await expect(page.getByTestId("slot-info-slot-2")).toContainText(/empty/i);
  });
});
