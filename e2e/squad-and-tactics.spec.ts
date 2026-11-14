import { expect, type Page, test } from "@playwright/test";

const PHASES = [
  "buildUp",
  "progression",
  "chanceCreation",
  "finishing",
  "defending",
  "pressing",
  "goalkeeping",
] as const;

const startCareer = async (page: Page) => {
  await page.goto("./");
  await page.getByTestId("club-name").first().click();
  await page.getByTestId("start-career").click();
  await expect(page.getByTestId("career-hub")).toBeVisible();
};

const openSquad = async (page: Page) => {
  await page.getByTestId("nav-squad").click();
  await expect(page.getByTestId("squad-screen")).toBeVisible();
};

const ratings = async (page: Page): Promise<string> =>
  (await Promise.all(PHASES.map((p) => page.getByTestId(`plan-rating-${p}`).textContent()))).join(
    ",",
  );

const idsWithStatus = async (page: Page, status: string): Promise<string[]> => {
  const rows = page.locator(`[data-testid^='plan-status-'][data-status='${status}']`);
  const testIds = await rows.evaluateAll((els) => els.map((e) => e.getAttribute("data-testid")));
  return testIds.map((t) => (t ?? "").replace(/^plan-status-/, ""));
};

const positionOfPlayer = async (page: Page, id: string): Promise<string> =>
  (await page.getByTestId(`plan-row-${id}`).getAttribute("data-position")) ?? "";

/** Swaps a starter for a bench player of the same position through the plan selects. */
const swapStarterWithBench = async (page: Page): Promise<{ off: string; on: string }> => {
  const bench = await idsWithStatus(page, "bench");
  const spare = await idsWithStatus(page, "out");
  for (const on of bench) {
    const position = await positionOfPlayer(page, on);
    if (position === "GK") continue;
    for (const free of spare) {
      if ((await positionOfPlayer(page, free)) !== position) continue;
      // Park a free player in the bench slot, then promote the freed bench player.
      const slot = page
        .locator("[data-testid^='bench-']")
        .filter({ has: page.locator(`option[value='${on}']:checked`) });
      await slot.selectOption(free);
      const starter = page
        .locator(`[data-testid^='starter-'][data-position='${position}']`)
        .first();
      const off = await starter.inputValue();
      await starter.selectOption(on);
      return { off, on };
    }
  }
  throw new Error("no same-position swap available");
};

test.describe("squad and tactics", () => {
  test("keeps a changed tactic after a reload @smoke", async ({ page }) => {
    await startCareer(page);
    await openSquad(page);
    await page.getByTestId("tactic-pressing").selectOption("high");
    await page.getByTestId("nav-hub").click();
    await page.getByTestId("quick-sim").click();
    await page.getByTestId("results-continue").click();

    await page.reload();
    await page.getByTestId("continue-career").click();
    await openSquad(page);
    await expect(page.getByTestId("tactic-pressing")).toHaveValue("high");
  });

  test("sets up the team, plays with half-time changes and sees the consequences", async ({
    page,
  }) => {
    test.setTimeout(90_000);
    await startCareer(page);
    await openSquad(page);

    const initial = await ratings(page);
    await page.getByTestId("formation").selectOption("4-3-3");
    const afterFormation = await ratings(page);
    expect(afterFormation).not.toBe(initial);

    // Ratings derive from the lineup only, so tactics leave them unchanged.
    await page.getByTestId("tactic-pressing").selectOption("high");
    await page.getByTestId("tactic-tempo").selectOption("fast");
    await expect(page.getByTestId("tactic-pressing")).toHaveValue("high");
    await expect(page.getByTestId("tactic-tempo")).toHaveValue("fast");
    expect(await ratings(page)).toBe(afterFormation);

    const { off, on } = await swapStarterWithBench(page);
    expect(await ratings(page)).not.toBe(afterFormation);

    const starters = await idsWithStatus(page, "starter");
    expect(starters).toContain(on);
    expect(starters).not.toContain(off);
    const bench = await idsWithStatus(page, "bench");

    await page.getByTestId("nav-hub").click();
    await page.getByTestId("play-match").click();
    await page.getByTestId("speed-4").click();
    await expect(page.getByTestId("half-time")).toBeVisible({ timeout: 30_000 });
    await page.getByTestId("sub-add").click();
    const subOff = await page.getByTestId("sub-off-0").inputValue();
    const subOn = await page.getByTestId("sub-on-0").inputValue();
    await page.getByTestId("tactic-mentality").selectOption("attacking");
    await page.getByTestId("start-second-half").click();
    await expect(page.getByTestId("period")).toHaveText("Full time", { timeout: 60_000 });
    const score = await page.getByTestId("score").textContent();
    await page.getByTestId("continue").click();
    await expect(page.getByTestId("matchday-results")).toBeVisible();
    expect(await page.getByTestId(/^result-score-/).allTextContents()).toContain(score);

    await openSquad(page);
    const fitness = async (id: string): Promise<number> => {
      const text = (await page.getByTestId(`plan-fitness-${id}`).textContent()) ?? "";
      return Number(text.replace(/\D+/g, ""));
    };
    const rested = bench.find((id) => id !== subOn);
    expect(rested).toBeDefined();
    const restedFitness = await fitness(rested ?? "");
    expect(await fitness(subOff)).toBeLessThan(restedFitness);
    for (const id of starters.filter((s) => s !== subOn)) {
      expect(await fitness(id)).toBeLessThan(restedFitness);
      const form = Number(await page.getByTestId(`plan-form-${id}`).textContent());
      expect(form).toBeGreaterThanOrEqual(4);
      expect(form).toBeLessThanOrEqual(6);
    }

    await page.reload();
    await page.getByTestId("continue-career").click();
    await openSquad(page);
    await expect(page.getByTestId("formation")).toHaveValue("4-3-3");
    await expect(page.getByTestId("tactic-pressing")).toHaveValue("high");
    await expect(page.getByTestId("tactic-tempo")).toHaveValue("fast");
    await expect(page.getByTestId(`plan-status-${on}`)).toHaveAttribute("data-status", "starter");
    await expect(page.getByTestId(`plan-status-${off}`)).not.toHaveAttribute(
      "data-status",
      "starter",
    );
  });
});
