import type { Page } from "@playwright/test";

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
