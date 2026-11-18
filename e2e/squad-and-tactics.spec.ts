import { expect, type Page, test } from "@playwright/test";

const LINES = ["goalkeeping", "defence", "midfield", "attack", "overall"] as const;

const startCareer = async (page: Page) => {
  await page.goto("./#/new");
  await page.getByTestId("choose-club").click();
  await page.getByTestId("club-name").first().click();
  await page.getByTestId("start-career").click();
  await expect(page.getByTestId("career-hub")).toBeVisible();
};

const openSquad = async (page: Page) => {
  await page.getByTestId("nav-squad").click();
  await expect(page.getByTestId("squad-screen")).toBeVisible();
};

/** Opens the tactics screen; `list` switches from the pitch to the selects (the keyboard route). */
const openTactics = async (page: Page, view: "pitch" | "list" = "list") => {
  await page.getByTestId("nav-tactics").click();
  await expect(page.getByTestId("tactics-screen")).toBeVisible();
  if (view === "list") await page.getByRole("radio", { name: "List" }).click();
};

/** Chooses a level of a tactic or a formation in its segmented control. */
const choose = async (page: Page, testId: string, name: string) => {
  await page.getByTestId(testId).getByRole("radio", { name, exact: true }).click();
};

/** Clicks the first pickable player of the half-time sheet and returns the player id. */
const pickFirst = async (page: Page): Promise<string> => {
  const pick = page.getByTestId(/^pick-/).first();
  const id = ((await pick.getAttribute("data-testid")) ?? "").slice("pick-".length);
  await pick.click();
  return id;
};

const ratings = async (page: Page): Promise<string> =>
  (await Promise.all(LINES.map((p) => page.getByTestId(`plan-rating-${p}`).textContent()))).join(
    ",",
  );

const idsWithStatus = async (page: Page, status: string): Promise<string[]> => {
  const rows = page.locator(`[data-testid^='plan-status-'][data-status='${status}']`);
  const testIds = await rows.evaluateAll((els) => els.map((e) => e.getAttribute("data-testid")));
  return testIds.map((t) => (t ?? "").replace(/^plan-status-/, ""));
};

/** Swaps a starter for a bench player of the same position in one step, through the lineup selects. */
const swapStarterWithBench = async (page: Page): Promise<{ off: string; on: string }> => {
  const benchSlots = page.locator("[data-testid^='bench-']");
  const count = await benchSlots.count();
  for (let i = 0; i < count; i++) {
    const slot = benchSlots.nth(i);
    const label = (await slot.locator("option:checked").textContent()) ?? "";
    const position = /\((DEF|MID|FWD)\)$/.exec(label)?.[1];
    if (!position) continue;
    const on = await slot.inputValue();
    const starter = page.locator(`[data-testid^='starter-'][data-position='${position}']`).first();
    const off = await starter.inputValue();
    await starter.selectOption(on);
    return { off, on };
  }
  throw new Error("no same-position swap available");
};

test.describe("squad and tactics", () => {
  test("keeps a changed tactic after a reload @smoke", async ({ page }) => {
    await startCareer(page);
    await openTactics(page);
    await choose(page, "tactic-pressing", "High");
    await page.getByTestId("nav-hub").click();
    await page.getByTestId("quick-sim").click();
    await page.getByTestId("results-continue").click();

    await page.reload();
    await page.getByTestId("continue-career").click();
    await openTactics(page);
    await expect(page.getByTestId("tactic-pressing")).toHaveAttribute("data-value", "high");
  });

  test("sets up the team, plays with half-time changes and sees the consequences", async ({
    page,
  }) => {
    test.setTimeout(90_000);
    await startCareer(page);
    await openTactics(page);

    const initial = await ratings(page);
    await choose(page, "formation", "4-3-3");
    const afterFormation = await ratings(page);
    expect(afterFormation).not.toBe(initial);

    // Ratings derive from the lineup only, so tactics leave them unchanged.
    await choose(page, "tactic-pressing", "High");
    await choose(page, "tactic-tempo", "Fast");
    await expect(page.getByTestId("tactic-pressing")).toHaveAttribute("data-value", "high");
    await expect(page.getByTestId("tactic-tempo")).toHaveAttribute("data-value", "fast");
    expect(await ratings(page)).toBe(afterFormation);

    const { off, on } = await swapStarterWithBench(page);
    expect(await ratings(page)).not.toBe(afterFormation);

    await openSquad(page);
    const starters = await idsWithStatus(page, "starter");
    expect(starters).toContain(on);
    expect(starters).not.toContain(off);
    const bench = await idsWithStatus(page, "bench");

    await page.getByTestId("nav-hub").click();
    await page.getByTestId("play-match").click();
    await page.getByTestId("kick-off").click();
    await page.getByTestId("speed-4").click();
    await expect(page.getByTestId("half-time")).toBeVisible({ timeout: 30_000 });
    await page.getByTestId("make-changes").click();
    await page.getByTestId("sub-add").click();
    const subOff = await pickFirst(page);
    const subOn = await pickFirst(page);
    await page
      .getByTestId("tactic-mentality")
      .getByRole("radio", { name: "Attacking", exact: true })
      .click();
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
    await openTactics(page);
    await expect(page.getByTestId("formation")).toHaveAttribute("data-value", "4-3-3");
    await expect(page.getByTestId("tactic-pressing")).toHaveAttribute("data-value", "high");
    await expect(page.getByTestId("tactic-tempo")).toHaveAttribute("data-value", "fast");
    await openSquad(page);
    await expect(page.getByTestId(`plan-status-${on}`)).toHaveAttribute("data-status", "starter");
    await expect(page.getByTestId(`plan-status-${off}`)).not.toHaveAttribute(
      "data-status",
      "starter",
    );
  });

  test("opens a player profile from the tactics screen and goes back to it", async ({ page }) => {
    await startCareer(page);
    await openTactics(page, "pitch");
    await page.locator('[data-testid^="profile-link-"]').first().focus();
    await page.keyboard.press("Enter");
    await expect(page.getByTestId("player-screen")).toBeVisible();
    await page.getByTestId("back-button").click();
    await expect(page).toHaveURL(/#\/tactics/);
  });

  test("changes a starter through the pitch picker and keeps it after a reload", async ({
    page,
  }) => {
    await startCareer(page);
    await openTactics(page, "pitch");
    const slot = page.getByTestId("pitch-slot-1");
    const before = await slot.getAttribute("aria-label");
    await slot.click();
    await page
      .getByTestId("player-picker")
      .locator("button:not([disabled]):not([aria-current='true'])")
      .first()
      .click();
    await expect(page.getByTestId("player-picker")).toHaveCount(0);
    const after = await slot.getAttribute("aria-label");
    expect(after).not.toBe(before);

    await page.getByTestId("nav-hub").click();
    await page.getByTestId("quick-sim").click();
    await page.getByTestId("results-continue").click();
    await page.reload();
    await page.getByTestId("continue-career").click();
    await openTactics(page, "pitch");
    // Fitness changed with the match; the player in the slot is the one chosen.
    const chosen = (after ?? "").split(", ")[1] ?? "";
    await expect(page.getByTestId("pitch-slot-1")).toHaveAttribute(
      "aria-label",
      new RegExp(`^[^,]+, ${chosen}, fitness`),
    );
  });
});
