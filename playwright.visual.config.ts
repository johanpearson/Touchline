import { defineConfig, devices } from "@playwright/test";

const STORYBOOK_PORT = 6008;
const APP_PORT = 4174;

// The smoke run on every PR (`VISUAL_SMOKE=1`): only the screens tagged `smoke: true` in screens.spec.ts, desktop
// midnight English, and only the app is built and served. The full run (every story and screen state, all
// widths) is part of the nightly workflow.
const SMOKE = process.env.VISUAL_SMOKE === "1";

/**
 * Visual regression (#253): screenshots of every Storybook story and of registered screen states,
 * compared with baselines in `e2e/visual/__screenshots__`. Baselines are made on the CI Linux runner
 * only (workflow `Update visual snapshots`), so the file names carry no platform suffix.
 *
 * `npm run test:visual` builds Storybook and the app first; the web servers only serve the builds.
 */
export default defineConfig({
  testDir: "e2e/visual",
  ...(SMOKE ? { testMatch: "screens.spec.ts", grep: /@smoke/ } : {}),
  snapshotPathTemplate: "{testDir}/__screenshots__/{arg}{ext}",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  // The JSON report is read by scripts/visual-breakage.mjs, which tells a broken screen state from a screenshot difference.
  reporter: process.env.CI
    ? [["github"], ["html", { open: "never" }], ["json", { outputFile: "visual-results.json" }]]
    : "list",
  expect: {
    toHaveScreenshot: {
      animations: "disabled",
      caret: "hide",
      // Per-pixel YIQ colour tolerance 0.1 absorbs anti-aliasing and one-step colour noise; a real token,
      // spacing or layout change moves far more than that. Up to 0.2% of the pixels (about 2,600 on a
      // 1440x900 page) may still differ, which stays well below what a layout change touches.
      threshold: 0.1,
      maxDiffPixelRatio: 0.002,
    },
  },
  use: { reducedMotion: "reduce", colorScheme: "dark", deviceScaleFactor: 1, locale: "en-GB" },
  projects: [{ name: "visual", use: { ...devices["Desktop Chrome"], deviceScaleFactor: 1 } }],
  webServer: [
    ...(SMOKE
      ? []
      : [
          {
            command: `node scripts/serve-static.mjs storybook-static ${STORYBOOK_PORT}`,
            url: `http://localhost:${STORYBOOK_PORT}/index.json`,
            reuseExistingServer: !process.env.CI,
          },
        ]),
    {
      command: `npm run preview -- --port ${APP_PORT} --strictPort`,
      url: `http://localhost:${APP_PORT}/Touchline/`,
      reuseExistingServer: !process.env.CI,
    },
  ],
});
