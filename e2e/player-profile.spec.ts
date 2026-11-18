import { expect, type Page, test } from "@playwright/test";

const startCareer = async (page: Page) => {
  await page.goto("./#/new");
  await page.getByTestId("choose-club").click();
  await page.getByTestId("club-name").first().click();
  await page.getByTestId("start-career").click();
  await expect(page.getByTestId("career-hub")).toBeVisible();
};

test.describe("player profile", () => {
  test("opens from the squad table by keyboard and goes back to the squad", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await startCareer(page);
    await page.evaluate(() => {
      window.location.hash = "#/squad";
    });
    const link = page.locator('[data-testid^="player-link-"]').first();
    await link.focus();
    await page.keyboard.press("Enter");

    await expect(page.getByTestId("player-screen")).toBeVisible();
    await expect(page.getByTestId("player-attr-finishing")).toBeVisible();

    await page.getByTestId("back-button").click();
    await expect(page.getByTestId("squad-screen")).toBeVisible();
  });

  test("opens from the command palette and shows not-found for an unknown id", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await startCareer(page);
    await page.keyboard.press("Control+k");
    await page.getByTestId("palette-input").fill("a");
    await page.locator('[data-testid^="palette-option-player-"]').first().click();
    await expect(page.getByTestId("player-screen")).toBeVisible();

    await page.evaluate(() => {
      window.location.hash = "#/player/nope";
    });
    await expect(page.getByTestId("not-found")).toBeVisible();
  });
});
