import { expect, type Page, test } from "@playwright/test";
import {
  advanceClock,
  chooseMode,
  freezeClock,
  playUntilVisible,
  unfreezeClock,
} from "./match-clock";

test.describe("smoke", () => {
  test("loads the app and shows the title @smoke", async ({ page }) => {
    await page.goto("./");

    await expect(page.getByTestId("app-title")).toHaveText("Touchline");
  });

  test("switches the language from Start to Settings and back @smoke", async ({ page }) => {
    await page.goto("./");
    await expect(page.getByTestId("locale-switch")).toHaveCount(0);

    await page.getByTestId("nav-settings").click();
    await page.getByRole("radio", { name: "Swedish" }).click();
    await expect(page.getByRole("radiogroup", { name: "Språk" })).toBeVisible();

    await page.goBack();
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Vinn ligan.");
  });
});

test.describe("blocked storage", () => {
  test("renders and switches language when window.localStorage throws", async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(window, "localStorage", {
        configurable: true,
        get() {
          throw new DOMException("blocked", "SecurityError");
        },
      });
    });
    await page.goto("./");
    await expect(page.getByTestId("app-title")).toHaveText("Touchline");

    await page.getByTestId("nav-settings").click();
    await page.getByRole("radio", { name: "Swedish" }).click();

    await expect(page.getByRole("radiogroup", { name: "Språk" })).toBeVisible();
  });
});

test.describe("new career", () => {
  test("picks a club, starts the career and shows the hub", async ({ page }) => {
    await page.goto("./");
    await page.getByTestId("new-career-link").click();
    await page.getByTestId("choose-club").click();

    const first = page.getByTestId("club-name").first();
    const name = (await first.textContent()) ?? "";
    await first.click();
    await page.getByTestId("start-career").click();

    await expect(page.getByTestId("career-hub")).toBeVisible();
    await expect(page.getByTestId("hub-club-name")).toHaveText(name);
    await expect(page.getByTestId("nav-club-name")).toHaveText(name);
    await expect(page.getByTestId("locale-switch")).toHaveCount(0);
  });
});

test.describe("league screen", () => {
  test("shows 14 clubs on zero points after starting a career", async ({ page }) => {
    await page.goto("./#/new");
    await page.getByTestId("choose-club").click();
    await page.getByTestId("club-name").first().click();
    await page.getByTestId("start-career").click();

    await page.getByTestId("nav-league").click();

    await expect(page.getByTestId("screen-league")).toBeVisible();
    await expect(page.getByTestId(/^table-row-/)).toHaveCount(14);
    const points = await page.getByTestId(/^table-points-/).allTextContents();
    expect(points).toHaveLength(14);
    expect(points.every((p) => p === "0")).toBe(true);
  });
});

/** Kicks off a match; `frozen` stops the page timers first so the test moves the match clock by hand. */
const startMatch = async (page: Page, { frozen = false }: { frozen?: boolean } = {}) => {
  await page.goto("./#/new");
  await page.getByTestId("choose-club").click();
  await page.getByTestId("club-name").first().click();
  await page.getByTestId("start-career").click();
  await page.getByTestId("play-match").click();
  if (frozen) await freezeClock(page);
  await page.getByTestId("kick-off").click();
};

test.describe("match screen", () => {
  test("shows the scoreboard, stats and feed, and the clock runs", async ({ page }) => {
    await startMatch(page, { frozen: true });

    await expect(page.getByTestId("scoreboard")).toBeVisible();
    await expect(page.getByTestId("stats-panel")).toBeVisible();
    await expect(page.getByTestId("momentum-chart")).toBeVisible();
    await advanceClock(page, 30_000);
    await expect(page.getByTestId("clock")).not.toHaveText("0’");
  });

  test("starts in Extended mode and plays the first minutes of a Full match", async ({ page }) => {
    await startMatch(page, { frozen: true });

    await expect(page.getByTestId("mode-extended")).toHaveAttribute("aria-checked", "true");
    await chooseMode(page, "full");
    await expect(page.getByTestId("mode-full")).toHaveAttribute("aria-checked", "true");
    await advanceClock(page, 60_000);
    await expect(page.getByTestId("clock")).not.toHaveText("0’");
    await expect(page.getByTestId("period")).toHaveText("First half");
  });

  test("pauses the clock and changes the playback mode", async ({ page }) => {
    await startMatch(page);

    await page.getByTestId("mode-highlights").click();
    await expect(page.getByTestId("mode-highlights")).toHaveAttribute("aria-checked", "true");
    await page.getByTestId("pause-toggle").click();
    const frozen = await page.getByTestId("clock").textContent();
    await page.waitForTimeout(500);
    await expect(page.getByTestId("clock")).toHaveText(frozen ?? "");
  });
});

test.describe("half-time", () => {
  test("plays a Highlights match to half-time, resumes and reaches full time", async ({ page }) => {
    await startMatch(page, { frozen: true });

    await chooseMode(page, "highlights");
    await playUntilVisible(page, page.getByTestId("half-time"));
    await expect(page.getByTestId("half-time-score")).toBeVisible();
    await page.getByTestId("start-second-half").click();
    await expect(page.getByTestId("half-time")).toBeHidden();
    await playUntilVisible(page, page.getByTestId("full-time-report"));
    await unfreezeClock(page);
    await expect(page.getByTestId("period")).toHaveText("Full time");
  });
});

test.describe("club screen", () => {
  test("opens My club and shows the squad table", async ({ page }) => {
    await page.goto("./#/new");
    await page.getByTestId("choose-club").click();
    await page.getByTestId("club-name").first().click();
    await page.getByTestId("start-career").click();

    await page.getByTestId("nav-club").click();

    await expect(page.getByTestId("club-screen")).toBeVisible();
    await expect(page.getByTestId("your-club")).toBeVisible();
    await expect(page.getByTestId("squad-table")).toBeVisible();
    await expect(page.getByTestId(/^squad-row-/)).toHaveCount(22);
  });
});
