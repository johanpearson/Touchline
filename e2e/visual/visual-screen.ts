import { expect, type Page, test } from "@playwright/test";
import {
  isSmokeCombination,
  type Locale,
  SMOKE_TAG,
  screenCombinations,
  snapshotName,
  type Theme,
} from "./visual-matrix";

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
  /**
   * Part of the smoke set that runs on every PR (desktop, midnight, English only). Pick a few simple,
   * fast and stable screens: the smoke run builds only the app and has to stay under a few minutes.
   */
  readonly smoke?: boolean;
};

/**
 * A full-page screenshot resizes the viewport while it captures, and a strip that re-centres on resize can be
 * caught before or after that shift (a 48 px difference, about one run in four). So the viewport is fitted to
 * the page up front and the screenshot is plain: everything has settled before it is taken.
 *
 * The height is only trusted once the fonts are loaded and the page height has stopped changing (content that
 * renders after load moved it by 8 px between two CI runs), and it is measured again after each resize until
 * resizing no longer changes it.
 */
async function fitViewportToPage(page: Page, width: number, minHeight: number) {
  const pageHeight = () => page.evaluate(() => document.documentElement.scrollHeight);
  await page.evaluate(() => document.fonts.ready);
  await waitForScrollToSettle(page);
  let height = Math.max(minHeight, await pageHeight());
  for (let attempt = 0; attempt < 5; attempt++) {
    await page.setViewportSize({ width, height });
    await waitForScrollToSettle(page);
    const measured = Math.max(minHeight, await pageHeight());
    if (measured === height) return;
    height = measured;
  }
}

/** Resolves when the page height and every scroll position have not changed for ten animation frames. */
function waitForScrollToSettle(page: Page) {
  return page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        const signature = () =>
          Array.from(document.querySelectorAll<HTMLElement>("*"))
            .filter((el) => el.scrollWidth > el.clientWidth || el.scrollHeight > el.clientHeight)
            .map((el) => `${el.scrollLeft}:${el.scrollTop}`)
            .concat(String(document.documentElement.scrollHeight))
            .join("|");
        let last = "";
        let stable = 0;
        const check = () => {
          const now = signature();
          stable = now === last ? stable + 1 : 0;
          last = now;
          if (stable >= 10) resolve();
          else requestAnimationFrame(check);
        };
        requestAnimationFrame(check);
      }),
  );
}

const FIXED_TIME = new Date("2030-01-15T12:00:00Z");

export async function preparePage(page: Page, theme: Theme, locale: Locale) {
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
  smoke = false,
}: VisualScreenState): void {
  test.describe(`screen ${name}`, () => {
    for (const combination of screenCombinations(full)) {
      const { viewport, theme, locale } = combination;
      const inSmokeSet = smoke && isSmokeCombination(combination);
      test(`${viewport.name} ${theme} ${locale}`, { tag: inSmokeSet ? SMOKE_TAG : [] }, async ({
        page,
      }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await preparePage(page, theme, locale);
        await page.goto(`${APP}${route}`);
        await page.waitForFunction((id) => document.documentElement.dataset.theme === id, theme);
        await state?.(page);
        await fitViewportToPage(page, viewport.width, viewport.height);
        await expect(page).toHaveScreenshot(snapshotName("screen", name, combination), {
          mask: mask.map((selector) => page.locator(selector)),
        });
      });
    }
  });
}
