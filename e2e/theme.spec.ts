import { expect, test } from "@playwright/test";

const htmlTheme = (page: import("@playwright/test").Page) =>
  page.evaluate(() => document.documentElement.dataset.theme);

test.describe("themes and typography", () => {
  test("starts in Midnight and keeps the chosen theme after a reload @smoke", async ({ page }) => {
    await page.goto("./");
    expect(await htmlTheme(page)).toBe("midnight");

    await page.getByTestId("theme-switch").selectOption("light");
    expect(await htmlTheme(page)).toBe("light");

    await page.reload();
    expect(await htmlTheme(page)).toBe("light");
    await expect(page.getByTestId("theme-switch")).toHaveValue("light");
  });

  test("sets the saved theme before the app renders (no flash)", async ({ page }) => {
    await page.addInitScript(() => window.localStorage.setItem("touchline.theme", "graphite"));
    await page.goto("./", { waitUntil: "commit" });
    await page.waitForFunction(() => document.documentElement.dataset.theme === "graphite");
  });

  test("still works when storage is unavailable", async ({ page }) => {
    await page.addInitScript(() => {
      const blocked = () => {
        throw new Error("blocked");
      };
      Storage.prototype.getItem = blocked;
      Storage.prototype.setItem = blocked;
    });
    await page.goto("./");
    expect(await htmlTheme(page)).toBe("midnight");
    await page.getByTestId("theme-switch").selectOption("graphite");
    expect(await htmlTheme(page)).toBe("graphite");
  });

  test("loads Barlow from the bundle and requests no font CDN", async ({ page }) => {
    const external: string[] = [];
    const fonts: string[] = [];
    page.on("request", (request) => {
      const url = new URL(request.url());
      if (url.hostname !== "localhost") external.push(request.url());
      if (/\.woff2?$/.test(url.pathname)) fonts.push(url.pathname);
    });
    await page.goto("./");
    await page.getByTestId("theme-switch").selectOption("light");
    await page.evaluate(() => document.fonts.ready);

    expect(external).toEqual([]);
    expect(fonts.some((f) => f.includes("barlow-latin-400"))).toBe(true);
    expect(await page.evaluate(() => getComputedStyle(document.body).fontFamily)).toContain(
      "Barlow",
    );
  });

  test("renders table figures as tabular numbers", async ({ page }) => {
    await page.goto("./#/new");
    await page.getByTestId("choose-club").click();
    await page.getByTestId("club-name").first().click();
    await page.getByTestId("start-career").click();
    await page
      .getByRole("link", { name: /league/i })
      .first()
      .click();
    const cell = page.locator("table td").first();
    expect(await cell.evaluate((el) => getComputedStyle(el).fontVariantNumeric)).toContain(
      "tabular-nums",
    );
  });

  test("disables transitions and animations under prefers-reduced-motion", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("./");
    const durations = await page.evaluate(() => {
      const probe = document.createElement("div");
      probe.style.transition = "opacity 2s";
      probe.style.animation = "x 2s";
      document.body.append(probe);
      const style = getComputedStyle(probe);
      return [style.transitionDuration, style.animationDuration];
    });
    for (const duration of durations) expect(Number.parseFloat(duration ?? "")).toBeLessThan(0.001);
  });
});
