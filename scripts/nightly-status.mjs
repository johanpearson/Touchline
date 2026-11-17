#!/usr/bin/env node
// Turns the results of the nightly jobs into `status.json` and one shields.io endpoint badge per job.
// The functions are pure and tested in nightly-status.test.ts; the command line at the bottom only reads and writes files.
//
//   node scripts/nightly-status.mjs result --job balance --outcome success --log balance.log --out result-balance.json
//   node scripts/nightly-status.mjs publish --in results --out site
//
// `result` reads GITHUB_SHA, GITHUB_REF_NAME and RUN_URL from the environment. `publish` reads every `result-*.json` in `--in`.
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

/** The nightly jobs, in the order they appear in the README. `key` names the files (`badge-<key>.json`). */
export const JOBS = [
  { key: "balance", label: "balance" },
  { key: "mutation", label: "mutation" },
  { key: "property", label: "property tests" },
  { key: "e2e", label: "e2e" },
  { key: "visual", label: "visual" },
];

/** Mutation score (percent) at or above which the badge is green, and at or above which it is yellow. */
export const MUTATION_GREEN = 80;
export const MUTATION_YELLOW = 60;

const COLOURS = { green: "brightgreen", yellow: "yellow", red: "red", grey: "lightgrey" };

const stripColour = (text) => text.replace(/\x1b\[[0-9;]*m/g, "");

const toNumber = (text) => {
  const value = Number.parseFloat(text);
  return Number.isFinite(value) ? value : null;
};

/** Goals, shots and home win rate per match from the average-vs-average table printed by the balance suite, or null. */
export const parseBalanceLog = (log) => {
  const text = stripColour(log);
  const start = text.indexOf("v2: average vs average");
  if (start === -1) return null;
  const table = text.slice(start);
  const cell = (label) => {
    const match = new RegExp(`^\\|\\s*${label}\\s*\\|\\s*([\\d.]+)\\s*\\|`, "m").exec(table);
    return match ? toNumber(match[1]) : null;
  };
  const home = /^\|\s*Home \/ draw \/ away\s*\|\s*([\d.]+)%/m.exec(table);
  const goals = cell("Goals");
  const shots = cell("Shots");
  const homeWinRate = home ? toNumber(home[1]) : null;
  if (goals === null || shots === null || homeWinRate === null) return null;
  return { goalsPerMatch: goals, shotsPerMatch: shots, homeWinPercent: homeWinRate };
};

/** The mutation score (percent) of "All files" from Stryker's clear-text report, or null. */
export const parseMutationScore = (log) => {
  const match = /All files\s*\|\s*([\d.]+)/.exec(stripColour(log));
  return match ? toNumber(match[1]) : null;
};

/** Wall time in minutes of the longest mutation shard, from the merged report's last section, or null. */
export const parseMutationMinutes = (log) => {
  const match = /Wall time \(longest shard\):\s*([\d.]+)\s*min/.exec(stripColour(log));
  return match ? toNumber(match[1]) : null;
};

/** The result a nightly job writes. `outcome` is the GitHub job status: success, failure, cancelled or skipped. */
export const makeResult = ({ job, outcome, date, sha, ref, runUrl, metrics }) => ({
  job,
  outcome,
  date,
  sha,
  ref,
  runUrl,
  metrics: metrics ?? {},
});

const jobOf = (key) => JOBS.find((job) => job.key === key) ?? { key, label: key };

const percent = (value) => `${value.toFixed(1)}%`;

/** Message and colour of a result. A red message always names the job. */
const describe = (result) => {
  const { label } = jobOf(result.job);
  if (result.outcome === "failure") return { message: `${label} failed`, colour: "red" };
  if (result.outcome !== "success") return { message: `${label} not run`, colour: "grey" };
  const { metrics } = result;
  if (typeof metrics.mutationScore === "number") {
    const score = metrics.mutationScore;
    if (score >= MUTATION_GREEN) return { message: percent(score), colour: "green" };
    if (score >= MUTATION_YELLOW) return { message: percent(score), colour: "yellow" };
    return { message: `${label} ${percent(score)} below ${MUTATION_YELLOW}%`, colour: "red" };
  }
  if (typeof metrics.goalsPerMatch === "number") {
    const { goalsPerMatch, shotsPerMatch, homeWinPercent } = metrics;
    return {
      message: `pass, ${goalsPerMatch.toFixed(2)} goals, ${shotsPerMatch.toFixed(1)} shots, ${homeWinPercent.toFixed(0)}% home`,
      colour: "green",
    };
  }
  return { message: "pass", colour: "green" };
};

/** One entry of status.json. */
export const toStatusEntry = (result) => {
  const { message, colour } = describe(result);
  return {
    job: result.job,
    label: jobOf(result.job).label,
    status: colour === "red" ? "red" : colour === "grey" ? "unknown" : colour === "yellow" ? "warn" : "pass",
    message,
    outcome: result.outcome,
    date: result.date,
    sha: result.sha,
    ref: result.ref,
    runUrl: result.runUrl,
    metrics: result.metrics,
  };
};

/** A shields.io endpoint badge (https://shields.io/badges/endpoint-badge). */
export const toBadge = (result) => {
  const { message, colour } = describe(result);
  return { schemaVersion: 1, label: jobOf(result.job).label, message, color: COLOURS[colour] };
};

/** The result of a job that wrote nothing (it never reached its result step, or the artifact is missing). */
export const missingResult = (job, context) => makeResult({ ...context, job, outcome: "skipped" });

/** status.json: every nightly job in README order. A job without a result shows as "not run". */
export const buildStatus = (results, context) => {
  const byJob = new Map(results.map((result) => [result.job, result]));
  const entries = JOBS.map(({ key }) => toStatusEntry(byJob.get(key) ?? missingResult(key, context)));
  const failing = entries.filter((entry) => entry.status === "red").map((entry) => entry.label);
  return { schemaVersion: 1, updated: context.date, sha: context.sha, ref: context.ref, runUrl: context.runUrl, ok: failing.length === 0, failing, jobs: entries };
};

/** Every file `publish` writes: status.json and badge-<job>.json, as name to JSON text. */
export const buildFiles = (results, context) => {
  const byJob = new Map(results.map((result) => [result.job, result]));
  const files = { "status.json": `${JSON.stringify(buildStatus(results, context), null, 2)}\n` };
  for (const { key } of JOBS) {
    const badge = toBadge(byJob.get(key) ?? missingResult(key, context));
    files[`badge-${key}.json`] = `${JSON.stringify(badge, null, 2)}\n`;
  }
  return files;
};

const argsOf = (argv) => {
  const args = {};
  for (let i = 0; i < argv.length; i += 2) args[argv[i].replace(/^--/, "")] = argv[i + 1];
  return args;
};

const readOptional = (path) => {
  try {
    return readFileSync(path, "utf8");
  } catch {
    return "";
  }
};

const metricsFor = (job, log) => {
  if (job === "balance") return parseBalanceLog(log) ?? {};
  if (job === "mutation") {
    const mutationScore = parseMutationScore(log);
    const durationMinutes = parseMutationMinutes(log);
    if (mutationScore === null) return {};
    return durationMinutes === null ? { mutationScore } : { mutationScore, durationMinutes };
  }
  return {};
};

const main = (argv) => {
  const [command, ...rest] = argv;
  const args = argsOf(rest);
  const env = process.env;
  const date = new Date().toISOString().slice(0, 10);
  const context = { date, sha: env.GITHUB_SHA ?? "unknown", ref: env.GITHUB_REF_NAME ?? "unknown", runUrl: env.RUN_URL ?? "" };
  if (command === "result") {
    const log = args.log ? readOptional(args.log) : "";
    const result = makeResult({ ...context, job: args.job, outcome: args.outcome, metrics: metricsFor(args.job, log) });
    writeFileSync(args.out, `${JSON.stringify(result, null, 2)}\n`);
    return;
  }
  if (command === "publish") {
    const names = readdirSync(args.in).filter((name) => /^result-.*\.json$/.test(name));
    const results = names.map((name) => JSON.parse(readFileSync(join(args.in, name), "utf8")));
    mkdirSync(args.out, { recursive: true });
    for (const [name, text] of Object.entries(buildFiles(results, context))) writeFileSync(join(args.out, name), text);
    return;
  }
  console.error("usage: nightly-status.mjs result|publish ...");
  process.exitCode = 2;
};

if (process.argv[1] === fileURLToPath(import.meta.url)) main(process.argv.slice(2));
