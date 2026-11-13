import { expect, test } from "@playwright/test";

const CLUBS = 14;
const MATCHDAYS = 26;

test.describe("season flow", () => {
  test("plays a match, quick-sims the season and starts season 2", async ({ page }) => {
    test.setTimeout(180_000);
    await page.goto("./");
    await page.getByTestId("club-name").first().click();
    await page.getByTestId("start-career").click();

    await page.getByTestId("play-match").click();
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
    for (let matchday = 2; matchday <= MATCHDAYS; matchday++) {
      await page.getByTestId("quick-sim").click();
      // After the last matchday the results page leads to the season end screen.
      if (matchday === MATCHDAYS) {
        await expect(page.getByTestId("results-continue")).toHaveAttribute("href", "#/season-end");
      }
      await page.getByTestId("results-continue").click();
    }
    await expect(page.getByTestId("champion")).toBeVisible();

    await page.getByTestId("next-season").click();
    await expect(page.getByTestId("career-hub")).toBeVisible();
    await expect(page.getByTestId("next-match-matchday")).toContainText("1");
  });
});
