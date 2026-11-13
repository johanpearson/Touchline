import { expect, test } from "@playwright/test";

test.describe("smoke", () => {
  test("loads the app and shows the title @smoke", async ({ page }) => {
    await page.goto("./");

    await expect(page.getByTestId("app-title")).toHaveText("Touchline");
  });

  test("switches the language @smoke", async ({ page }) => {
    await page.goto("./");
    await expect(page.getByLabel("Language")).toBeVisible();

    await page.getByTestId("locale-switch").selectOption("sv");

    await expect(page.getByLabel("Språk")).toBeVisible();
  });
});
