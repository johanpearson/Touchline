import { expect, type Page, test } from "@playwright/test";

const story = async (page: Page, id: string) => {
  await page.goto(`iframe.html?id=${id}&viewMode=story`);
  await page.getByTestId("strip").waitFor();
};

const FADE_PX = 24;

test.describe("ScrollArea", () => {
  test("shows no default scrollbar although the content overflows", async ({ page }) => {
    await story(page, "components-scrollarea--many-items");
    const area = page.getByTestId("strip");
    const sizes = await area.evaluate((el) => ({
      overflows: el.scrollWidth > el.clientWidth,
      scrollbarHeight: el.offsetHeight - el.clientHeight,
    }));
    expect(sizes.overflows).toBe(true);
    expect(sizes.scrollbarHeight).toBe(0);
  });

  test("is focusable and scrolls with the arrow keys", async ({ page }) => {
    await story(page, "components-scrollarea--many-items");
    const area = page.getByTestId("strip");
    await area.focus();
    expect(await area.evaluate((el) => el.scrollLeft)).toBe(0);
    for (let i = 0; i < 5; i++) await page.keyboard.press("ArrowRight");
    await expect.poll(() => area.evaluate((el) => el.scrollLeft)).toBeGreaterThan(0);
  });

  test("scrolls a focused item into view, clear of the edge fade", async ({ page }) => {
    await story(page, "components-scrollarea--edge-fade");
    const area = page.getByTestId("strip");
    const last = area.getByRole("button").last();
    await last.focus();
    await expect
      .poll(async () => {
        const [a, b] = await Promise.all([area.boundingBox(), last.boundingBox()]);
        if (!a || !b) return false;
        return b.x + b.width <= a.x + a.width - FADE_PX + 1 && b.x >= a.x + FADE_PX - 1;
      })
      .toBe(true);
  });

  test("scrolls instantly under prefers-reduced-motion", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await story(page, "components-scrollarea--scroll-snap");
    const area = page.getByTestId("strip");
    const styles = await area.evaluate((el) => {
      const s = getComputedStyle(el);
      return { behavior: s.scrollBehavior, snap: s.scrollSnapType };
    });
    expect(styles.behavior).toBe("auto");
    expect(styles.snap).toBe("none");
  });

  test("smooth-scrolls and snaps when motion is allowed", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await story(page, "components-scrollarea--scroll-snap");
    const styles = await page.getByTestId("strip").evaluate((el) => {
      const s = getComputedStyle(el);
      return { behavior: s.scrollBehavior, snap: s.scrollSnapType };
    });
    expect(styles.behavior).toBe("smooth");
    expect(styles.snap).toContain("x");
  });
});
