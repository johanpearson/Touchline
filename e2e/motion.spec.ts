import { expect, type Page, test } from "@playwright/test";

const startCareer = async (page: Page) => {
  await page.goto("./#/new");
  await page.getByTestId("choose-club").click();
  await page.getByTestId("club-name").first().click();
  await page.getByTestId("start-career").click();
  await expect(page.getByTestId("career-hub")).toBeVisible();
};

/** Records every layout shift score of the page from now on. */
const watchLayoutShift = (page: Page) =>
  page.evaluate(() => {
    const w = window as unknown as { __cls: number };
    w.__cls = 0;
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const shift = entry as PerformanceEntry & { value: number; hadRecentInput: boolean };
        if (!shift.hadRecentInput) w.__cls += shift.value;
      }
    }).observe({ type: "layout-shift", buffered: true });
  });

test.describe("motion", () => {
  test("a route change causes no layout shift and keeps the focus management", async ({ page }) => {
    await startCareer(page);
    await watchLayoutShift(page);

    await page.getByTestId("nav-league").click();
    await expect(page.getByTestId("page-announcement")).not.toBeEmpty();
    await page.getByTestId("nav-squad").click();
    await page.waitForTimeout(400);

    const cls = await page.evaluate(() => (window as unknown as { __cls: number }).__cls);
    expect(cls).toBe(0);
    await expect(page.locator("#main").locator("h1, h2").first()).toBeFocused();
  });

  test("with reduced motion a route change only fades", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await startCareer(page);

    await page.getByTestId("nav-league").click();
    const transform = await page
      .getByTestId("route-transition")
      .evaluate((el) => getComputedStyle(el).transform);

    expect(["none", "matrix(1, 0, 0, 1, 0, 0)"]).toContain(transform);
  });

  test("with reduced motion a toast appears without moving", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await startCareer(page);
    await page.goto("./#/saves");
    await page.getByTestId("export-career").click();

    const toast = page.locator("[data-tone='success']").first();
    await expect(toast).toBeVisible();
    const duration = await toast.evaluate((el) => getComputedStyle(el).animationDuration);
    expect(Number.parseFloat(duration)).toBeLessThan(0.001);
  });
});
