import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { SCREEN_STATES } from "./visual/screen-states";
import { LOCALES, SCREEN_VIEWPORTS, THEMES } from "./visual/visual-matrix";
import { preparePage } from "./visual/visual-screen";

// Accessibility audit (#272): axe over every screen state of the shared registry (e2e/visual/screen-states.ts)
// at 1440x900, 1024x768 and 390x844, in all three themes and both languages. Zero violations is the gate.
// A state is set up once per width and language; the themes are switched on the open page, because a
// theme only changes tokens and setting up a state (some play a season) is the expensive part.
const APP = "http://localhost:4174/Touchline/";
const TAGS = ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"];

type Finding = { id: string; impact?: string | null; help: string; targets: string[] };

const summarise = (findings: readonly Finding[]) =>
  findings
    .map(
      (f) =>
        `${f.id} (${f.impact ?? "n/a"}): ${f.help}\n    ${f.targets.slice(0, 5).join("\n    ")}`,
    )
    .join("\n");

for (const state of SCREEN_STATES) {
  test.describe(`a11y ${state.name}`, () => {
    for (const viewport of SCREEN_VIEWPORTS) {
      for (const locale of LOCALES) {
        test(`${viewport.name} ${locale}`, async ({ page }, testInfo) => {
          test.setTimeout(180_000);
          await page.setViewportSize({ width: viewport.width, height: viewport.height });
          await preparePage(page, "midnight", locale);
          await page.goto(`${APP}${state.route ?? "#/"}`);
          await page.waitForFunction(() => document.documentElement.dataset.theme === "midnight");
          await state.state?.(page);

          // Let route and state transitions end: axe measures contrast on a half-faded element otherwise.
          await page.evaluate(() => document.fonts.ready);
          await page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished)));
          const violations: string[] = [];
          const incomplete: string[] = [];
          for (const theme of THEMES) {
            await page.evaluate((id) => {
              document.documentElement.dataset.theme = id;
            }, theme);
            const results = await new AxeBuilder({ page }).withTags(TAGS).analyze();
            const toFinding = (r: (typeof results.violations)[number]): Finding => ({
              id: r.id,
              impact: r.impact,
              help: r.help,
              targets: r.nodes.map((n) => n.target.join(" ")),
            });
            if (results.violations.length > 0) {
              violations.push(`[${theme}]\n${summarise(results.violations.map(toFinding))}`);
            }
            for (const r of results.incomplete) incomplete.push(`[${theme}] ${r.id}: ${r.help}`);
          }
          // Incomplete results need a human look; they are listed on the test, not failed.
          if (incomplete.length > 0) {
            testInfo.annotations.push({
              type: "axe-incomplete",
              description: [...new Set(incomplete)].join("\n"),
            });
          }
          expect(violations, violations.join("\n")).toEqual([]);
        });
      }
    }
  });
}
