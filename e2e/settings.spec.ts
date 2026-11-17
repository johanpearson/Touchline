import { expect, test } from "@playwright/test";

test.describe("settings screen", () => {
  test("opens from the start screen and keeps the language after a reload @smoke", async ({
    page,
  }) => {
    await page.goto("./");
    await page.getByTestId("nav-settings").click();
    await expect(page).toHaveURL(/#\/settings$/);
    await expect(page.getByRole("heading", { level: 1, name: "Settings" })).toBeVisible();

    await page.getByRole("radio", { name: "Swedish" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Inställningar" })).toBeVisible();

    await page.reload();
    await expect(page.getByRole("heading", { level: 1, name: "Inställningar" })).toBeVisible();
  });

  test("remembers the table density", async ({ page }) => {
    await page.goto("./#/settings");
    const group = page.getByRole("radiogroup", { name: "Table density" });
    await expect(group.getByRole("radio", { name: "Compact" })).toBeChecked();

    await group.getByRole("radio", { name: "Comfortable" }).click();
    await page.reload();

    await expect(
      page.getByRole("radiogroup", { name: "Table density" }).getByRole("radio", {
        name: "Comfortable",
      }),
    ).toBeChecked();
  });

  test("shows a motion note when the system asks for reduced motion", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("./#/settings");
    await expect(page.getByTestId("settings-motion-note")).toBeVisible();
  });

  test("has no horizontal scroll on a phone", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("./#/settings");
    await expect(page.getByTestId("settings-screen")).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
});
