import { expect, type Page, test } from "@playwright/test";
import {
  quickSimToSeasonEnd,
  resignExpiredPlayers,
  startFirstClubCareer,
} from "./off-season-helpers";

const MIN_SQUAD = 18;
const MAX_SQUAD = 30;

/** "€1.2M" to 1200, "€450k" to 450, "−€80k" to -80 (thousands). */
const thousands = (text: string): number => {
  const amount = Number.parseFloat(text.replace(/[^\d.]/g, ""));
  const value = text.includes("M") ? amount * 1000 : amount;
  return /^[−-]/.test(text.trim()) ? -value : value;
};

const squadCount = async (page: Page): Promise<number> => {
  await page.getByTestId("nav-squad").click();
  await expect(page.getByTestId("squad-screen")).toBeVisible();
  await expect(page.getByTestId(/^plan-row-/).first()).toBeVisible();
  return page.getByTestId(/^plan-row-/).count();
};

/** The id and age of the first player of the squad who is young enough to stay until the rollover. */
const youngPlayer = async (page: Page): Promise<{ id: string; age: number }> => {
  const ages = page.locator("[data-testid^='player-age-']");
  await expect(ages.first()).toBeVisible();
  const count = await ages.count();
  for (let i = 0; i < count; i++) {
    const age = Number.parseInt((await ages.nth(i).textContent()) ?? "", 10);
    if (age <= 28) {
      const testId = (await ages.nth(i).getAttribute("data-testid")) ?? "";
      return { id: testId.replace("player-age-", ""), age };
    }
  }
  throw new Error("no young player in the squad");
};

/** Waits until the market shows this squad size; the figure changes with every completed move. */
const expectMarketSquad = async (page: Page, count: number): Promise<void> => {
  await expect(page.getByTestId("market-squad-count")).toContainText(`${count} of`);
};

const balanceOf = async (page: Page): Promise<number> =>
  thousands((await page.getByTestId("market-balance").textContent()) ?? "");

/**
 * The id of the last row of the visible market table. Tables are sorted by overall, best first, so
 * the last row is among the cheapest and fits the balance and the wage budget.
 */
const cheapestPlayer = async (page: Page, buttonPrefix: string): Promise<string> => {
  const button = page.locator(`[data-testid^='${buttonPrefix}']:visible`).last();
  await expect(button).toBeVisible();
  return ((await button.getAttribute("data-testid")) ?? "").replace(buttonPrefix, "");
};

test.describe("off-season", () => {
  test("works the off-season and starts season 2 with a new signing", async ({ page }) => {
    test.setTimeout(240_000);
    await startFirstClubCareer(page);

    const before = await squadCount(page);
    const known = await youngPlayer(page);

    await page.getByTestId("nav-hub").click();
    await quickSimToSeasonEnd(page, 1);
    await page.getByTestId("next-season").click();
    await expect(page.getByTestId("screen-off-season")).toBeVisible();

    // The review: youth players and at least one mover.
    await expect(page.getByTestId(/^youth-/)).toHaveCount(3);
    await expect(page.getByTestId(/^(risers|fallers)-/).first()).toBeVisible();
    const retired = await page.getByTestId("retirements").locator("li").count();
    await resignExpiredPlayers(page);

    // Buy a player from another club: the balance falls by the fee that was asked.
    await page.getByTestId("off-season-market").click();
    await expect(page.getByTestId("market-screen")).toBeVisible();
    const balanceBefore = await balanceOf(page);
    const squadBefore = before + 3 - retired;
    await expectMarketSquad(page, squadBefore);
    const boughtId = await cheapestPlayer(page, "buy-");
    const fee = thousands((await page.getByTestId(`market-fee-${boughtId}`).textContent()) ?? "");
    await page.getByTestId(`buy-${boughtId}`).click();
    await page.getByTestId("confirm-buy").click();
    await expectMarketSquad(page, squadBefore + 1);
    // The balance is shown rounded to 0.1M, so the difference is the fee within one rounding step.
    const spent = balanceBefore - (await balanceOf(page));
    expect(Math.abs(spent - fee)).toBeLessThanOrEqual(100);
    // A fee below one rounding step can leave the displayed balance unchanged.
    if (fee >= 100) expect(spent).toBeGreaterThan(0);

    // Sign a free agent.
    await page.getByTestId("market-tab-free-agents").click();
    const signedId = await cheapestPlayer(page, "free-agent-sign-");
    await page.getByTestId(`free-agent-sign-${signedId}`).click();
    await page.getByTestId("confirm-sign").click();
    await expectMarketSquad(page, squadBefore + 2);

    // Accept an offer when there is one, otherwise release a surplus player.
    await page.getByTestId("market-tab-offers").click();
    const accept = page.getByTestId(/^offer-accept-/);
    if ((await accept.count()) > 0) {
      await accept.first().click();
    } else {
      await page
        .getByTestId(/^release-/)
        .first()
        .click();
      await page.getByTestId("confirm-release").click();
    }
    await expectMarketSquad(page, squadBefore + 1);

    await page.getByTestId("nav-hub").click();
    await page.getByTestId("to-off-season").click();
    await page.getByTestId("start-next-season").click();
    await expect(page.getByTestId("career-hub")).toBeVisible();
    await expect(page.getByTestId("next-match-matchday")).toContainText("1");

    // Season 2: the squad has grown by three youth players, one purchase, one signing and one exit (retired players left at the rollover).
    const after = await squadCount(page);
    expect(after).toBe(before - retired + 3 + 1 + 1 - 1);
    expect(after).toBeGreaterThanOrEqual(MIN_SQUAD);
    expect(after).toBeLessThanOrEqual(MAX_SQUAD);
    await expect(page.getByTestId(`player-age-${known.id}`)).toHaveText(String(known.age + 1));
    await expect(page.getByTestId(`player-contract-${signedId}`)).toBeVisible();
    await expect(page.getByTestId(`player-contract-${boughtId}`)).toBeVisible();

    // The career survives a reload.
    await page.reload();
    await page.getByTestId("continue-career").click();
    await expect(page.getByTestId("career-hub")).toBeVisible();
    await expect(page.getByTestId("next-match-matchday")).toContainText("1");
    expect(await squadCount(page)).toBe(after);
    await expect(page.getByTestId(`player-contract-${signedId}`)).toBeVisible();
  });
});
