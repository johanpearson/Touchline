import { expect, type Page, test } from "@playwright/test";

const startCareer = async (page: Page) => {
  await page.goto("./#/new");
  await page.getByTestId("choose-club").click();
  await page.getByTestId("club-name").first().click();
  await page.getByTestId("start-career").click();
  await expect(page.getByTestId("career-hub")).toBeVisible();
};

test.describe("command palette", () => {
  test("opens with Control+K, moves through the results and closes with Escape", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await startCareer(page);

    await page.keyboard.press("Control+k");
    await expect(page.getByTestId("command-palette")).toBeVisible();
    await expect(page.getByTestId("palette-input")).toBeFocused();

    await page.getByTestId("palette-input").fill("a");
    await page.getByRole("option").first().waitFor();
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Escape");
    await expect(page.getByTestId("command-palette")).toBeHidden();
  });

  test("jumps to a screen from the search button on a phone", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await startCareer(page);

    await page.getByTestId("palette-open").click();
    await page.getByTestId("palette-input").fill("league");
    await page.keyboard.press("Enter");

    await expect(page).toHaveURL(/#\/league$/);
    await expect(page.getByTestId("command-palette")).toBeHidden();
  });

  test("keeps Swedish labels inside the sheet and results at least 48 px tall on a phone", async ({
    page,
  }) => {
    await page.addInitScript(() => window.localStorage.setItem("touchline.locale", "sv"));
    await page.setViewportSize({ width: 390, height: 844 });
    await startCareer(page);

    await page.getByTestId("palette-open").click();
    await expect(page.getByRole("group", { name: "Åtgärder" })).toBeVisible();

    // The sheet fills the phone once its open animation has finished.
    const sheetBox = () => page.getByTestId("command-palette").boundingBox();
    await expect.poll(async () => (await sheetBox())?.x).toBe(0);
    expect((await sheetBox())?.width).toBe(390);
    for (const option of await page.getByRole("option").all()) {
      const box = await option.boundingBox();
      expect(box?.height).toBeGreaterThanOrEqual(48);
      expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(390);
    }
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
});
