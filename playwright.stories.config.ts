import { defineConfig, devices } from "@playwright/test";

const PORT = 6007;

/**
 * Checks of component behaviour that jsdom cannot show (real scrollbars, real focus scrolling),
 * run on a story in all three engines. Separate from `playwright.config.ts` so the app E2E keeps
 * its single browser.
 */
export default defineConfig({
  testDir: "e2e-stories",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: { baseURL: `http://localhost:${PORT}/`, trace: "on-first-retry" },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],
  webServer: {
    command: `npx storybook dev -p ${PORT} --ci --no-open`,
    url: `http://localhost:${PORT}/`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
