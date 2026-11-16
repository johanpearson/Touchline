#!/usr/bin/env node
// Decides which CI jobs a pull request needs, from the files it changes (risk-based CI scoping).
//
// Rules of thumb: a job runs when a changed file can change its result. Anything the rules do not recognise runs
// everything, and so does a push to main, the label `full-ci`, an empty file list or any error, so a mistake here makes CI
// slower, never weaker. The full balance suite also runs every night (nightly.yml).
//
// CLI (used by the `scope` job in ci.yml): changed files on stdin, one per line; EVENT and LABELS in the environment;
// prints `name=value` lines for $GITHUB_OUTPUT.

const ALL_ON = {
  verify: true,
  perf: true,
  storybook: true,
  balance: "fast",
  e2eSmoke: true,
  e2eStories: true,
};

const DOC = /^(docs\/|reference\/|\.github\/ISSUE_TEMPLATE\/|\.github\/pull_request_template\.md$|LICENSE)|\.md$/;
// Dependencies, tooling and CI themselves: a change here can affect every job.
const GLOBAL =
  /^(package(-lock)?\.json|tsconfig[^/]*\.json|biome\.jsonc?|vite\.config\.[^/]+|vitest[^/]*\.config\.[^/]+|playwright[^/]*\.config\.[^/]+|\.nvmrc|scripts\/|\.github\/workflows\/ci\.yml$)/;
const UNIT_TEST = /\.test\.(ts|tsx)$/;
const ENGINE_SIDE = /^src\/(engine|game|shared)\//;
const FULL_BALANCE = /^src\/engine\/|\.balance\.test\.ts$|^vitest\.balance\.config\.ts$|^scripts\/balance-groups\.mjs$|^\.github\/workflows\/ci\.yml$/;
const UI_SIDE = /^(src\/(ui|i18n|platform)\/|\.storybook\/|index\.html$|public\/|.*\.css$)/;
const STORIES = /^(src\/ui\/|\.storybook\/|e2e-stories\/|.*\.css$)/;
const APP_SOURCE = /^(src\/|e2e\/(?!visual\/)|index\.html$|public\/|.*\.css$)/;

const any = (files, pattern) => files.some((file) => pattern.test(file));

/** The jobs a change needs. `event` is the GitHub event name, `files` the changed paths, `labels` the PR labels. */
export function ciScope({ event, files, labels = [] }) {
  if (event !== "pull_request" || files.length === 0) return { ...ALL_ON };
  const global = any(files, GLOBAL);
  const everything = global || labels.includes("full-ci");
  const code = files.filter((file) => !DOC.test(file));
  const appFiles = code.filter((file) => !UNIT_TEST.test(file));
  return {
    verify: everything || code.length > 0,
    perf: everything || any(code, ENGINE_SIDE),
    storybook: everything || any(code, UI_SIDE),
    balance: balanceMode(files, labels, everything, any(code, ENGINE_SIDE)),
    e2eSmoke: everything || any(appFiles, APP_SOURCE),
    e2eStories: everything || any(appFiles, STORIES),
  };
}

function balanceMode(files, labels, everything, engineSide) {
  if (labels.includes("full-balance") || any(files, FULL_BALANCE)) return "full";
  return everything || engineSide ? "fast" : "none";
}

export function formatOutputs(scope) {
  return Object.entries(scope)
    .map(([name, value]) => `${name}=${value}\n`)
    .join("");
}

async function main() {
  const { readFileSync } = await import("node:fs");
  let scope = { ...ALL_ON };
  try {
    const files = readFileSync(0, "utf8")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    const labels = (process.env.LABELS ?? "").split(",").filter(Boolean);
    scope = ciScope({ event: process.env.EVENT ?? "", files, labels });
  } catch (error) {
    console.error(`::warning::CI scope failed (${error}); running every job.`);
  }
  process.stdout.write(formatOutputs(scope));
}

if (import.meta.url === `file://${process.argv[1]}`) await main();
