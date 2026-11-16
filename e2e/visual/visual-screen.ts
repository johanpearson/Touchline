import { expect, type Page, test } from "@playwright/test";
import { type Locale, screenCombinations, snapshotName, type Theme } from "./visual-matrix";

const APP = "http://localhost:4174/Touchline/";

export type VisualScreenState = {
  /** Unique id of the screen state; becomes the snapshot folder name. */
  readonly name: string;
  /** Hash route to open, for example `#/squad`. */
  readonly route?: string;
  /** Brings the page into the state to shoot (fill a form, open a dialog). Runs after load. */
  readonly state?: (page: Page) => Promise<void>;
  /** Selectors of non-deterministic areas (a WebGL canvas) that are masked in the screenshot. */
  readonly mask?: readonly string[];
  /**
   * Shoot the full matrix (3 widths x 3 themes x 2 languages) instead of the core one (desktop and phone,
   * midnight, English). Reserve it for the few screens where theme, tablet or Swedish layout is a real risk.
   */
  readonly full?: boolean;
};

const FIXED_TIME = new Date("2030-01-15T12:00:00Z");

async function preparePage(page: Page, theme: Theme, locale: Locale) {
  // Deterministic data: the composition root draws its seed from Math.random and the clock from Date,
  // so both are fixed before the app starts.
  await page.clock.setFixedTime(FIXED_TIME);
  await page.addInitScript(() => {
    Math.random = () => 0.123456789;
  });
  await page.addInitScript(
    ([themeId, localeId]) => {
      window.localStorage.setItem("touchline.theme", themeId);
      window.localStorage.setItem("touchline.locale", localeId);
    },
    [theme, locale] as const,
  );
}

/**
 * Registers a screenshot test for every combination of the core matrix (desktop and phone, midnight,
 * English) of one screen state, or of the full matrix with `full: true`. Each screen issue calls it with
 * its own key states; a PR that changes a screen updates the baselines in the same PR.
 */
export function visualScreen({
  name,
  route = "#/",
  state,
  mask = [],
  full = false,
}: VisualScreenState): void {
  test.describe(`screen ${name}`, () => {
    for (const combination of screenCombinations(full)) {
      const { viewport, theme, locale } = combination;
      test(`${viewport.name} ${theme} ${locale}`, async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await preparePage(page, theme, locale);
        await page.goto(`${APP}${route}`);
        await page.waitForFunction((id) => document.documentElement.dataset.theme === id, theme);
        await state?.(page);
        await page.evaluate(() => document.fonts.ready);
        await expect(page).toHaveScreenshot(snapshotName("screen", name, combination), {
          mask: mask.map((selector) => page.locator(selector)),
          fullPage: true,
        });
      });
    }
  });
}
