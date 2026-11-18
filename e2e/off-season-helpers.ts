import { expect, type Page } from "@playwright/test";

export const MATCHDAYS = 26;

/** Starts a career with the first club of the list and waits for the hub. */
export const startFirstClubCareer = async (page: Page): Promise<void> => {
  await page.goto("./#/new");
  await page.getByTestId("choose-club").click();
  await page.getByTestId("club-name").first().click();
  await page.getByTestId("start-career").click();
  await expect(page.getByTestId("career-hub")).toBeVisible();
};

/**
 * Quick-sims the matchdays `first` to the last one from the hub, and ends on the season end
 * screen (the results page of the last matchday leads there).
 */
export const quickSimToSeasonEnd = async (page: Page, first: number): Promise<void> => {
  for (let matchday = first; matchday <= MATCHDAYS; matchday++) {
    await page.getByTestId("quick-sim").click();
    if (matchday === MATCHDAYS) {
      await expect(page.getByTestId("results-continue")).toHaveAttribute("href", "#/season-end");
    }
    await page.getByTestId("results-continue").click();
  }
  await expect(page.getByTestId("champion")).toBeVisible();
};

/**
 * Re-signs every player of the user's club whose contract has ended, at the asked wage, so the
 * squad stays legal. Used on the off-season screen.
 */
export const resignExpiredPlayers = async (page: Page): Promise<void> => {
  const buttons = page.getByTestId(/^resign-/);
  while ((await buttons.count()) > 0) {
    await buttons.first().click();
    await page.getByTestId("confirm-resign").click();
    await page.getByTestId("confirm-resign").waitFor({ state: "detached" });
  }
};
