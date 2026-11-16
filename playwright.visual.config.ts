import { defineConfig, devices } from "@playwright/test";

const STORYBOOK_PORT = 6008;
const APP_PORT = 4174;

/**
 * Visual regression (#253): screenshots of every Storybook story and of registered screen states,
 * compared with baselines in `e2e/visual/__screenshots__`. Baselines are made on the CI Linux runner
 * only (workflow `Update visual snapshots`), so the file names carry no platform suffix.
 *
 * `npm run test:visual` builds Storybook and the app first; the web servers only serve the builds.
 */
export default defineConfig({
  testDir: "e2e/visual",
  snapshotPathTemplate: "{testDir}/__screenshots__/{arg}{ext}",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  expect: {
    toHaveScreenshot: {
      animations: "disabled",
      caret: "hide",
      // Per-pixel colour tolerance 0: a one-step change of a token (for example #0a0e17 to #0a0e18) must fail.
      // The same browser build on the same runner image renders identical pixels. 0.1% of the pixels
      // (about 1,400 on a 1440x900 page) absorbs sub-pixel anti-aliasing noise in text, but is far below
      // what a real colour, spacing or layout change touches.
      threshold: 0,
      maxDiffPixelRatio: 0.001,
    },
  },
  use: { reducedMotion: "reduce", colorScheme: "dark", deviceScaleFactor: 1, locale: "en-GB" },
  projects: [{ name: "visual", use: { ...devices["Desktop Chrome"], deviceScaleFactor: 1 } }],
  webServer: [
    {
      command: `node scripts/serve-static.mjs storybook-static ${STORYBOOK_PORT}`,
      url: `http://localhost:${STORYBOOK_PORT}/index.json`,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: `npm run preview -- --port ${APP_PORT} --strictPort`,
      url: `http://localhost:${APP_PORT}/Touchline/`,
      reuseExistingServer: !process.env.CI,
    },
  ],
});
