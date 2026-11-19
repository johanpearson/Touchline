import { expect, type Page, test } from "@playwright/test";
import { freezeClock, playUntilVisible, unfreezeClock } from "./match-clock";

// Keyboard-only flows (#272): every step moves focus with Tab and acts with Enter or Space. A control that cannot
// be reached this way fails the test, which a click or a programmatic focus would not show.
const MAX_TABS = 120;

/** Presses Tab until the focused element has the given data-testid (a string, or a pattern for a prefix). */
const tabTo = async (page: Page, testId: string | RegExp) => {
  const matches = (id: string | null) =>
    id !== null && (typeof testId === "string" ? id === testId : testId.test(id));
  for (let presses = 0; presses < MAX_TABS; presses++) {
    const focused = await page.evaluate(
      () => document.activeElement?.getAttribute("data-testid") ?? null,
    );
    if (matches(focused)) return;
    await page.keyboard.press("Tab");
  }
  throw new Error(`${testId} was not reached with Tab in ${MAX_TABS} presses`);
};

const press = async (page: Page, testId: string | RegExp, key = "Enter") => {
  await tabTo(page, testId);
  await page.keyboard.press(key);
};

const startCareerWithKeyboard = async (page: Page) => {
  await page.goto("./#/new");
  await press(page, "choose-club");
  // The selected club in the strip is the first stop, so Tab reaches the start button.
  await press(page, "start-career");
  await expect(page.getByTestId("career-hub")).toBeVisible();
};

test.describe("keyboard only", () => {
  test("starts a new career", async ({ page }) => {
    await startCareerWithKeyboard(page);
  });

  test("plays and pauses a match", async ({ page }) => {
    await startCareerWithKeyboard(page);
    await press(page, "play-match");
    await press(page, "kick-off");
    await expect(page.getByTestId("match-screen")).toBeVisible();
    const pause = page.getByTestId("pause-toggle");
    const playing = await pause.getAttribute("aria-pressed");
    await press(page, "pause-toggle", "Space");
    await expect(pause).not.toHaveAttribute("aria-pressed", playing ?? "");
  });

  test("makes a half-time substitution", async ({ page }) => {
    test.setTimeout(120_000);
    await startCareerWithKeyboard(page);
    await press(page, "play-match");
    await freezeClock(page);
    await press(page, "kick-off");
    // The mode control is a radio group: Tab reaches the selected mode, the arrow keys choose another.
    await tabTo(page, /^mode-/);
    // The default is Extended, the middle mode, so one press back reaches Highlights.
    await page.keyboard.press("ArrowLeft");
    await expect(page.getByTestId("mode-highlights")).toBeChecked();
    await playUntilVisible(page, page.getByTestId("half-time"));
    await unfreezeClock(page);
    await press(page, "make-changes");
    await press(page, "sub-add");
    await press(page, /^pick-/);
    await press(page, /^pick-/);
    await expect(page.getByTestId("sub-off-0")).toBeVisible();
  });

  test("saves and loads a career", async ({ page }) => {
    await startCareerWithKeyboard(page);
    await press(page, "nav-saves");
    await expect(page.getByTestId("saves-screen")).toBeVisible();
    await press(page, "save-slot-1");
    await expect(page.getByTestId("load-slot-1")).toBeVisible();
    await press(page, "load-slot-1");
    await expect(page.getByTestId("career-hub")).toBeVisible();
  });
});
