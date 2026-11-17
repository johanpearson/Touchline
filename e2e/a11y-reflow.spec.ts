import { expect, type Page, test } from "@playwright/test";

// Reflow (WCAG 1.4.10, #272): at 320 CSS px wide, which is a 1280 px window at 400% zoom, a page has no
// horizontal scroll. Two-dimensional scroll is allowed inside the pitch stage and data tables, which scroll in
// their own container; only the page itself must not.
const SIZES = [
  { name: "320 px wide", width: 320, height: 568 },
  { name: "400% zoom of 1280x1024", width: 320, height: 256 },
];
const ROUTES = ["#/new", "#/squad", "#/league", "#/tactics", "#/saves", "#/settings", "#/nope"];

const pageOverflow = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

for (const size of SIZES) {
  test.describe(size.name, () => {
    test.use({ viewport: { width: size.width, height: size.height } });

    test("start screen and every career screen have no horizontal page scroll", async ({
      page,
    }) => {
      test.setTimeout(120_000);
      await page.goto("./#/");
      await expect(page.getByTestId("saved-empty")).toBeVisible();
      expect(await pageOverflow(page)).toBeLessThanOrEqual(0);

      await page.goto("./#/new");
      await page.getByTestId("choose-club").click();
      await page.getByTestId("club-name").first().click();
      await page.getByTestId("start-career").click();
      await expect(page.getByTestId("career-hub")).toBeVisible();

      for (const route of ["#/", ...ROUTES]) {
        await page.evaluate((hash) => {
          window.location.hash = hash;
        }, route);
        await page.waitForLoadState();
        await page.evaluate(() => document.fonts.ready);
        expect(await pageOverflow(page), `horizontal page scroll on ${route}`).toBeLessThanOrEqual(
          0,
        );
      }
    });
  });
}
