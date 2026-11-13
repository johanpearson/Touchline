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

test.describe("new career", () => {
  test("picks a club, starts the career and shows the hub", async ({ page }) => {
    await page.goto("./");

    const first = page.getByTestId("club-name").first();
    const name = (await first.textContent()) ?? "";
    await first.click();
    await page.getByTestId("start-career").click();

    await expect(page.getByTestId("career-hub")).toBeVisible();
    await expect(page.getByTestId("hub-club-name")).toHaveText(name);
    await expect(page.getByTestId("nav-club-name")).toHaveText(name);
    await expect(page.getByTestId("locale-switch")).toBeVisible();
  });
});

test.describe("match screen", () => {
  test("shows the scoreboard, stats and feed, and the clock runs", async ({ page }) => {
    await page.goto("./#/match");

    await expect(page.getByTestId("scoreboard")).toBeVisible();
    await expect(page.getByTestId("stats-panel")).toBeVisible();
    await expect(page.getByTestId("momentum-chart")).toBeVisible();
    await expect(page.getByTestId("clock")).not.toHaveText("0’", { timeout: 10_000 });
  });

  test("pauses the clock and changes the speed", async ({ page }) => {
    await page.goto("./#/match");

    await page.getByTestId("speed-4").click();
    await expect(page.getByTestId("speed-4")).toHaveAttribute("aria-pressed", "true");
    await page.getByTestId("pause-toggle").click();
    const frozen = await page.getByTestId("clock").textContent();
    await page.waitForTimeout(500);
    await expect(page.getByTestId("clock")).toHaveText(frozen ?? "");
  });
});

test.describe("half-time", () => {
  test("plays to half-time, resumes and reaches full time", async ({ page }) => {
    await page.goto("./#/match");

    await page.getByTestId("speed-4").click();
    await expect(page.getByTestId("half-time")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId("half-time-score")).toBeVisible();
    await page.getByTestId("start-second-half").click();
    await expect(page.getByTestId("half-time")).toBeHidden();
    await expect(page.getByTestId("period")).toHaveText("Full time", { timeout: 60_000 });
  });
});

test.describe("club screen", () => {
  test("opens My club and shows the squad table", async ({ page }) => {
    await page.goto("./");
    await page.getByTestId("club-name").first().click();
    await page.getByTestId("start-career").click();

    await page.getByTestId("nav-club").click();

    await expect(page.getByTestId("club-screen")).toBeVisible();
    await expect(page.getByTestId("your-club")).toBeVisible();
    await expect(page.getByTestId("squad-table")).toBeVisible();
    await expect(page.getByTestId(/^squad-row-/)).toHaveCount(22);
  });
});
