import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import {
  combinations,
  localesFor,
  STORY_VIEWPORTS,
  type StoryEntry,
  snapshotName,
  themesFor,
} from "./visual-matrix";

const STORYBOOK = "http://localhost:6008";

// Discovered from the built Storybook, so a new story gets a baseline requirement without editing this file.
const index = JSON.parse(readFileSync("storybook-static/index.json", "utf8")) as {
  entries: Record<string, StoryEntry>;
};
const stories = Object.values(index.entries).filter((entry) => entry.type === "story");

for (const story of stories) {
  test.describe(story.id, () => {
    for (const combination of combinations(
      STORY_VIEWPORTS,
      localesFor(story.tags),
      themesFor(story.tags),
    )) {
      const { viewport, theme, locale } = combination;
      test(`${viewport.name} ${theme} ${locale}`, async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.goto(
          `${STORYBOOK}/iframe.html?id=${story.id}&viewMode=story&globals=theme:${theme};locale:${locale}`,
        );
        await page.locator("#storybook-root > *").first().waitFor();
        await page.evaluate(() => document.fonts.ready);
        await expect(page).toHaveScreenshot(snapshotName("story", story.id, combination));
      });
    }
  });
}
