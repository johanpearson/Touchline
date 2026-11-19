import { readFile } from "node:fs/promises";
import { expect, type Page, test } from "@playwright/test";
import {
  advanceClock,
  chooseMode,
  freezeClock,
  playUntilVisible,
  unfreezeClock,
} from "./match-clock";

const CLUBS = 14;

const startCareer = async (page: Page) => {
  await page.goto("./#/new");
  await page.getByTestId("choose-club").click();
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

test.describe("match engine", () => {
  test("quick-sims a matchday and updates the table @smoke", async ({ page }) => {
    await startCareer(page);
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
    await startCareer(page);

    await page.getByTestId("play-match").click();
    await freezeClock(page);
    await page.getByTestId("kick-off").click();
    await chooseMode(page, "highlights");

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

    await playUntilVisible(page, page.getByTestId("half-time"));
    await page.getByTestId("make-changes").click();
    await page.getByTestId("sub-add").click();
    await page
      .getByTestId(/^pick-/)
      .first()
      .click();
    await page
      .getByTestId(/^pick-/)
      .first()
      .click();
    await page.getByTestId("tactic-mentality").getByRole("radio", { name: "Attacking" }).click();
    await page.getByTestId("start-second-half").click();

    await playUntilVisible(page, page.getByTestId("continue"));
    await unfreezeClock(page);
    await expect(page.getByTestId("period")).toHaveText("Full time");
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
    await page.getByTestId("kick-off").click();
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

test.describe("match in progress", () => {
  test("a reload mid-match resumes it paused and finishes with the final score of an uninterrupted run", async ({
    browser,
  }) => {
    test.setTimeout(180_000);
    const SEED = "424242";

    /** Starts a career with a fixed seed and club, kicks off in Highlights and returns the page. */
    const kickOff = async (page: Page) => {
      await page.goto(`./#/new`);
      await page.getByTestId("choose-club").click();
      await page.locator("details summary").click();
      await page.getByTestId("seed-input").fill(SEED);
      await page.getByTestId("club-name").first().click();
      await page.getByTestId("start-career").click();
      await expect(page.getByTestId("career-hub")).toBeVisible();
      await page.getByTestId("play-match").click();
      await freezeClock(page);
      await page.getByTestId("kick-off").click();
      await chooseMode(page, "highlights");
    };
    const toFullTime = async (page: Page) => {
      await playUntilVisible(page, page.getByTestId("half-time"));
      await page.getByTestId("start-second-half").click();
      await playUntilVisible(page, page.getByTestId("continue"));
      return page.getByTestId("score").textContent();
    };

    const control = await (await browser.newContext()).newPage();
    await kickOff(control);
    const expected = await toFullTime(control);

    const page = await (await browser.newContext()).newPage();
    await kickOff(page);
    await advanceClock(page, 40_000);
    const minute = await page.getByTestId("clock").textContent();
    await page.getByTestId("pause-toggle").click();
    await expect(page.getByTestId("pause-toggle")).toHaveText("Play");
    await unfreezeClock(page);
    await page.reload();
    await page.getByTestId("continue-career").click();
    await expect(page.getByTestId("career-hub")).toBeVisible();
    await expect(page.getByTestId("header-action")).toHaveText("Resume match");
    await freezeClock(page);
    await page.getByTestId("header-action").click();

    await expect(page.getByTestId("pre-match")).toHaveCount(0);
    await expect(page.getByTestId("match-screen")).toBeVisible();
    await expect(page.getByTestId("clock")).toHaveText(minute ?? "");
    await expect(page.getByTestId("pause-toggle")).toHaveText("Resume");

    await page.getByTestId("pause-toggle").click();
    expect(await toFullTime(page)).toBe(expected);
  });
});
