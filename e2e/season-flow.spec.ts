import { expect, test } from "@playwright/test";
import { quickSimToSeasonEnd, resignExpiredPlayers } from "./off-season-helpers";

const CLUBS = 14;

test.describe("season flow", () => {
  test("plays a match, quick-sims the season and starts season 2", async ({ page }) => {
    test.setTimeout(180_000);
    await page.goto("./#/new");
    await page.getByTestId("choose-club").click();
    await page.getByTestId("club-name").first().click();
    await page.getByTestId("start-career").click();

    await page.getByTestId("play-match").click();
    await page.getByTestId("kick-off").click();
    await page.getByTestId("speed-4").click();
    await expect(page.getByTestId("half-time")).toBeVisible({ timeout: 30_000 });
    await page.getByTestId("start-second-half").click();
    await expect(page.getByTestId("period")).toHaveText("Full time", { timeout: 60_000 });
    const score = await page.getByTestId("score").textContent();
    await page.getByTestId("continue").click();

    await expect(page.getByTestId("matchday-results")).toBeVisible();
    expect(await page.getByTestId(/^result-score-/).allTextContents()).toContain(score);

    await page.getByTestId("nav-league").click();
    await expect(page.getByTestId(/^table-row-/)).toHaveCount(CLUBS);
    const played = await page
      .locator("[data-testid^='table-row-'] td:nth-child(3)")
      .allTextContents();
    expect(played).toHaveLength(CLUBS);
    expect(played.every((p) => p === "1")).toBe(true);

    await page.getByTestId("nav-hub").click();
    await quickSimToSeasonEnd(page, 2);

    await page.getByTestId("next-season").click();
    await expect(page.getByTestId("screen-off-season")).toBeVisible();
    await expect(page.getByTestId(/^youth-/)).toHaveCount(3);
    await resignExpiredPlayers(page);
    await page.getByTestId("start-next-season").click();
    await expect(page.getByTestId("career-hub")).toBeVisible();
    await expect(page.getByTestId("next-match-matchday")).toContainText("1");
  });
});
