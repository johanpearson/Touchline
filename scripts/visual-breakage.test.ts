import { writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
// @ts-expect-error plain Node module with no type declarations
import * as breakage from "./visual-breakage.mjs";

type Result = { status: string; error?: { message: string } };

/** A Playwright JSON report with one describe block ("screen <name>") holding one spec per result. */
const report = (screens: Record<string, Record<string, Result>>) => ({
  suites: [
    {
      title: "screens.spec.ts",
      specs: [],
      suites: Object.entries(screens).map(([name, specs]) => ({
        title: `screen ${name}`,
        specs: Object.entries(specs).map(([title, result]) => ({
          title,
          tests: [{ results: [result] }],
        })),
      })),
    },
  ],
});

// Messages as Playwright writes them, with their terminal colour codes.
const PIXELS =
  "Error: \u001b[2mexpect(\u001b[22m\u001b[31mpage\u001b[39m\u001b[2m).\u001b[22mtoHaveScreenshot\u001b[2m(\u001b[22m\u001b[32mexpected\u001b[39m\u001b[2m)\u001b[22m failed\n\n  61216 pixels (ratio 0.05 of all image pixels) are different.";
const SIZE =
  "Error: expect(page).toHaveScreenshot(expected) failed\n\n  Expected an image 390px by 1136px, received 390px by 1128px.";
const MISSING =
  "Error: A snapshot doesn't exist at /repo/e2e/visual/__screenshots__/screen-x-desktop-midnight.png, writing actual.";
const TIMEOUT = "Error: locator.click: Test timeout of 30000ms exceeded.\nCall log:\n  - waiting for locator";
const SETUP_TIMEOUT = '\u001b[31mTest timeout of 1ms exceeded while setting up "context".\u001b[39m';

describe("broken screen states", () => {
  it("are none when every test passed", () => {
    expect(breakage.findBrokenStates(report({ a: { "desktop midnight en": { status: "passed" } } }))).toEqual([]);
  });

  it("are not screenshot differences: pixels, size and a missing baseline only look different", () => {
    const failed = report({
      a: {
        pixels: { status: "failed", error: { message: PIXELS } },
        size: { status: "failed", error: { message: SIZE } },
        missing: { status: "failed", error: { message: MISSING } },
      },
    });

    expect(breakage.findBrokenStates(failed)).toEqual([]);
    expect(breakage.countScreenshotDifferences(failed)).toBe(3);
  });

  it("are tests that time out or throw outside a screenshot comparison", () => {
    const broken = report({
      "saves-slots": { "desktop midnight en": { status: "timedOut", error: { message: TIMEOUT } } },
      other: {
        "phone light sv": { status: "failed", error: { message: "Error: page.goto: net::ERR_CONNECTION_REFUSED" } },
        setup: { status: "timedOut", error: { message: SETUP_TIMEOUT } },
      },
    });

    const found = breakage.findBrokenStates(broken);

    expect(found.map((b: { title: string }) => b.title)).toEqual([
      "screen saves-slots › desktop midnight en",
      "screen other › phone light sv",
      "screen other › setup",
    ]);
    expect(found[0].message).toContain("Test timeout of 30000ms exceeded");
    expect(found[2].message).not.toContain("\u001b");
  });

  it("ignore skipped tests", () => {
    const quiet = report({
      a: { skipped: { status: "skipped" }, ok: { status: "passed" } },
    });

    expect(breakage.findBrokenStates(quiet)).toEqual([]);
  });

  it("count a failure without any message as broken", () => {
    const found = breakage.findBrokenStates(report({ a: { x: { status: "failed" } } }));

    expect(found).toHaveLength(1);
    expect(found[0].message).toBe("failed without a message");
  });
});

describe("the annotations", () => {
  it("give one error line per broken state, with the first line of the message, escaped for GitHub", () => {
    const lines = breakage.formatAnnotations([
      { title: "screen a › desktop midnight en", message: "Error: locator.click: Test timeout of 30000ms exceeded.\nCall log:" },
      { title: "screen b › x", message: "50% broken\r\nsecond line" },
    ]);

    expect(lines).toEqual([
      "::error title=Visual state broken: screen a › desktop midnight en::Error: locator.click: Test timeout of 30000ms exceeded.",
      "::error title=Visual state broken: screen b › x::50%25 broken",
    ]);
  });
});

describe("the command line", () => {
  const run = (path: string) => breakage.check(path);

  it("passes for a report without broken states", () => {
    const path = join(tmpdir(), "visual-ok.json");
    writeFileSync(path, JSON.stringify(report({ a: { x: { status: "failed", error: { message: PIXELS } } } })));

    expect(run(path)).toEqual({ ok: true, lines: [expect.stringContaining("1 screenshot difference")] });
  });

  it("fails for a broken state and names it", () => {
    const path = join(tmpdir(), "visual-broken.json");
    writeFileSync(path, JSON.stringify(report({ a: { x: { status: "timedOut", error: { message: TIMEOUT } } } })));

    const outcome = run(path);

    expect(outcome.ok).toBe(false);
    expect(outcome.lines[0]).toContain("::error title=Visual state broken: screen a › x::");
  });

  it("fails when there is no report, because then the run itself broke", () => {
    const outcome = run(join(tmpdir(), "visual-does-not-exist.json"));

    expect(outcome.ok).toBe(false);
    expect(outcome.lines[0]).toContain("::error::");
  });

  it("fails when the report is not valid JSON", () => {
    const path = join(tmpdir(), "visual-garbled.json");
    writeFileSync(path, "{ not json");

    expect(run(path).ok).toBe(false);
  });
});
