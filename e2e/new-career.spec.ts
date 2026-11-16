import { expect, test } from "@playwright/test";

test.describe("new career wizard", () => {
  test("goes from the start screen through the league step to the club step", async ({ page }) => {
    await page.goto("./");
    await page.getByTestId("new-career-link").click();

    await expect(page.getByTestId("league-step")).toBeVisible();
    await expect(page.getByRole("radio", { checked: true })).toHaveCount(1);
    await page.getByTestId("choose-club").click();

    await expect(page).toHaveURL(/#\/new\/club$/);
    await expect(page.getByTestId("new-career")).toBeVisible();
    await page.getByTestId("wizard-back").click();
    await expect(page.getByTestId("league-step")).toBeVisible();
  });

  test("sends a direct visit of the club step back to the league step", async ({ page }) => {
    await page.goto("./#/new/club");
    await expect(page).toHaveURL(/#\/new$/);
    await expect(page.getByTestId("league-step")).toBeVisible();
  });

  test("does not scroll the page sideways on a phone", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("./#/new");
    await expect(page.getByTestId("league-step")).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
});
