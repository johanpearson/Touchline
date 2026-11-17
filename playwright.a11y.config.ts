import { defineConfig, devices } from "@playwright/test";

const APP_PORT = 4174;

/**
 * Accessibility audit (#272): axe over every registered screen state (`e2e/a11y.spec.ts`). It reuses the state
 * registry of the visual tests and serves the production build, like them. Reduced motion is on so that no
 * transition is half way when axe measures contrast.
 *
 * `npm run test:a11y` builds the app first; CI runs it sharded (job `Accessibility`).
 */
export default defineConfig({
  testDir: "e2e",
  testMatch: "a11y.spec.ts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: process.env.CI
    ? [["github"], ["html", { open: "never" }], ["json", { outputFile: "a11y-results.json" }]]
    : "list",
  use: { reducedMotion: "reduce", colorScheme: "dark", deviceScaleFactor: 1, locale: "en-GB" },
  projects: [{ name: "a11y", use: { ...devices["Desktop Chrome"], deviceScaleFactor: 1 } }],
  webServer: {
    command: `npm run preview -- --port ${APP_PORT} --strictPort`,
    url: `http://localhost:${APP_PORT}/Touchline/`,
    reuseExistingServer: !process.env.CI,
  },
});
