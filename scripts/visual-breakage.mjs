#!/usr/bin/env node
// Tells a broken visual screen state from a screenshot that only looks different, in a Playwright JSON report.
//
// Visual regression is report-only on pull requests: a screen that differs from its baseline (pixels, size, or no
// baseline yet for a new state) never fails the PR, because the `Visual baselines` workflow makes the new
// baselines after merge. A state that times out or throws is different: nobody can make a baseline for it, and
// the baseline workflow fails after merge (#322). This script fails the visual shard for those states only.
//
// CLI (used by the visual shards in ci.yml): `node scripts/visual-breakage.mjs <playwright-json-report>`.

import { readFileSync } from "node:fs";

const FAILED = new Set(["failed", "timedOut", "interrupted"]);

// "expect(page).toHaveScreenshot(expected) failed" (pixels differ, size differs, the screenshot does not settle)
// and "A snapshot doesn't exist at ..., writing actual." (a new state with no baseline yet).
const SCREENSHOT_DIFFERENCE = /toHaveScreenshot\(.*?\) failed|A snapshot doesn't exist at/s;

// Playwright colours its messages with terminal escape codes.
// biome-ignore lint/suspicious/noControlCharactersInRegex: the escape character is what is removed
const ANSI = /\u001b\[[0-9;]*m/g;

const plain = (text) => text.replace(ANSI, "");

const messageOf = (result) => result.error?.message ?? result.errors?.[0]?.message ?? "";

/** The last attempt of a test decides; every finished spec of the nested suites is visited. */
function* failedResults(suite, path = []) {
  const here = suite.title.endsWith(".ts") ? path : [...path, suite.title];
  for (const spec of suite.specs ?? []) {
    for (const test of spec.tests ?? []) {
      const last = test.results?.at(-1);
      if (last && FAILED.has(last.status)) yield { title: [...here, spec.title].join(" › "), result: last };
    }
  }
  for (const child of suite.suites ?? []) yield* failedResults(child, here);
}

const allFailures = (report) => (report.suites ?? []).flatMap((suite) => [...failedResults(suite)]);

/** Failed tests that are not a screenshot comparison: timeouts, thrown errors, a page that did not load. */
export function findBrokenStates(report) {
  return allFailures(report)
    .map(({ title, result }) => ({ title, message: plain(messageOf(result)) || "failed without a message" }))
    .filter(({ message }) => !SCREENSHOT_DIFFERENCE.test(message));
}

export function countScreenshotDifferences(report) {
  return allFailures(report).filter(({ result }) => SCREENSHOT_DIFFERENCE.test(plain(messageOf(result)))).length;
}

// GitHub workflow commands: the data part must escape %, carriage returns and line feeds.
const escapeData = (text) => text.replace(/%/g, "%25").replace(/\r/g, "%0D").replace(/\n/g, "%0A");
const firstLine = (text) => text.split(/\r?\n/)[0].slice(0, 300);

export function formatAnnotations(broken) {
  return broken.map(
    ({ title, message }) => `::error title=Visual state broken: ${escapeData(title)}::${escapeData(firstLine(message))}`,
  );
}

const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

/** Reads the report and returns `{ ok, lines }`: the lines are what to print, `ok` is false when a state is broken. */
export function check(path) {
  let report;
  try {
    report = JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    return {
      ok: false,
      lines: [`::error::No usable Playwright report at ${path} (${error.message}); the visual run itself broke.`],
    };
  }
  const broken = findBrokenStates(report);
  const differences = countScreenshotDifferences(report);
  if (broken.length === 0) {
    return { ok: true, lines: [`${plural(differences, "screenshot difference")} (not blocking), no broken screen state.`] };
  }
  return {
    ok: false,
    lines: [
      ...formatAnnotations(broken),
      `${plural(broken.length, "broken screen state")} and ${plural(differences, "screenshot difference")} (not blocking).`,
    ],
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { ok, lines } = check(process.argv[2] ?? "visual-results.json");
  for (const line of lines) console.log(line);
  process.exitCode = ok ? 0 : 1;
}
