import { expect, type Page, test } from "@playwright/test";

const DESKTOP = { width: 1440, height: 900 };
const TABLET = { width: 1024, height: 768 };
const PHONE = { width: 390, height: 844 };

const startCareer = async (page: Page) => {
  await page.goto("./#/new");
  await page.getByTestId("choose-club").click();
  await page.getByTestId("club-name").first().click();
  await page.getByTestId("start-career").click();
  await expect(page.getByTestId("career-hub")).toBeVisible();
};

const noHorizontalScroll = async (page: Page) => {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
};

test.describe("app shell layouts", () => {
  test("shows a labelled sidebar on a desktop", async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await startCareer(page);

    await expect(page.getByTestId("app-shell")).toHaveAttribute("data-mode", "sidebar");
    await expect(page.getByTestId("nav-league")).toContainText("League");
    await noHorizontalScroll(page);
  });

  test("shows an icon rail on a tablet", async ({ page }) => {
    await page.setViewportSize(TABLET);
    await startCareer(page);

    await expect(page.getByTestId("app-shell")).toHaveAttribute("data-mode", "rail");
    await expect(page.getByTestId("nav-league")).toHaveAttribute("aria-label", "League");
    await expect(page.getByTestId("nav-league")).not.toContainText("League");
    await noHorizontalScroll(page);
  });

  test("shows five bottom tabs of at least 44 px on a phone", async ({ page }) => {
    await page.setViewportSize(PHONE);
    await startCareer(page);

    await expect(page.getByTestId("app-shell")).toHaveAttribute("data-mode", "tabs");
    const nav = page.getByTestId("career-nav");
    const tabs = nav.locator("a, button[data-testid='nav-more']");
    await expect(tabs).toHaveCount(5);
    for (const box of await tabs.evaluateAll((els) =>
      els.map((el) => el.getBoundingClientRect().toJSON()),
    )) {
      expect(box.width).toBeGreaterThanOrEqual(44);
      expect(box.height).toBeGreaterThanOrEqual(44);
    }
    await noHorizontalScroll(page);
  });

  test("opens the More sheet on a phone and reaches Saves", async ({ page }) => {
    await page.setViewportSize(PHONE);
    await startCareer(page);

    await page.getByTestId("nav-more").click();
    await page.getByTestId("nav-saves").click();

    await expect(page).toHaveURL(/#\/saves$/);
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });

  test("keeps the longest Swedish labels unclipped in the tab bar", async ({ page }) => {
    await page.setViewportSize(PHONE);
    await page.addInitScript(() => window.localStorage.setItem("touchline.locale", "sv"));
    await startCareer(page);

    const clipped = await page
      .getByTestId("career-nav")
      .locator("a span:last-child")
      .evaluateAll((els) => els.filter((el) => el.scrollWidth > el.clientWidth).length);
    expect(clipped).toBe(0);
  });
});

test.describe("app shell keyboard and focus", () => {
  test("tabs from the skip link into the navigation, then the header and the content", async ({
    page,
  }) => {
    await page.setViewportSize(DESKTOP);
    await startCareer(page);

    await page.keyboard.press("Tab");
    await expect(page.getByRole("button", { name: "Skip to content" })).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(page.getByTestId("nav-hub")).toBeFocused();
    // The other six items, then language and theme, then the search button and the header action.
    for (let i = 0; i < 6; i += 1) await page.keyboard.press("Tab");
    await expect(page.getByTestId("nav-saves")).toBeFocused();
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    await expect(page.getByTestId("palette-open")).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(page.getByTestId("header-action")).toBeFocused();
  });

  test("moves focus to the page heading and updates the title on navigation", async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await startCareer(page);

    await page.getByTestId("nav-league").click();

    await expect(page.locator("main h1, main h2").first()).toBeFocused();
    await expect(page).toHaveTitle(/ - Touchline$/);
  });

  test("traps focus in the More sheet and restores it on Escape", async ({ page }) => {
    await page.setViewportSize(PHONE);
    await startCareer(page);

    await page.getByTestId("nav-more").click();
    await expect(page.getByRole("dialog")).toBeVisible();
    for (let i = 0; i < 8; i += 1) await page.keyboard.press("Tab");
    expect(await page.evaluate(() => !!document.activeElement?.closest("[role='dialog']"))).toBe(
      true,
    );
    await page.keyboard.press("Escape");
    await expect(page.getByTestId("nav-more")).toBeFocused();
  });
});
