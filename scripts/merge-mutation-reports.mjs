#!/usr/bin/env node
// Merges the Stryker reports of the nightly mutation shards into one score and one log.
// The log keeps Stryker's clear-text "All files | <score>" line, which nightly-status.mjs reads, and adds the wall time of the
// longest shard. The command fails below the break threshold (applied to the merged score, not to a shard) and when a shard
// left no report. The functions are pure and tested in merge-mutation-reports.test.ts.
//
//   node scripts/merge-mutation-reports.mjs --in shards --shards 8 --out mutation.log      (--break defaults to thresholds.break of stryker.config.json)
//
// Each shard writes `<in>/mutation-shard-<n>/mutation.json` (Stryker's json report) and `meta.json` (`{ "seconds": 1234 }`).
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const DETECTED = ["Killed", "Timeout"];
const UNDETECTED = ["Survived", "NoCoverage"];

const sum = (counts, statuses) => statuses.reduce((total, name) => total + (counts[name] ?? 0), 0);

/** Stryker's mutation score in percent: detected mutants over valid ones (compile and runtime errors and ignored mutants do not count). */
export const scoreOf = (counts) => {
  const detected = sum(counts, DETECTED);
  const valid = detected + sum(counts, UNDETECTED);
  return valid === 0 ? 100 : (detected / valid) * 100;
};

const add = (counts, status) => {
  counts[status] = (counts[status] ?? 0) + 1;
};

/** Status counts per file and in total, over any number of reports (a file of two reports is added up). */
export const summarise = (reports) => {
  const byFile = new Map();
  const total = {};
  for (const report of reports) {
    for (const [path, file] of Object.entries(report.files ?? {})) {
      const counts = byFile.get(path) ?? {};
      byFile.set(path, counts);
      for (const mutant of file.mutants ?? []) {
        add(counts, mutant.status);
        add(total, mutant.status);
      }
    }
  }
  const files = [...byFile.entries()].sort(([a], [b]) => (a < b ? -1 : 1)).map(([path, counts]) => ({ path, counts }));
  return { files, total };
};

const row = (name, counts) =>
  `${name.padEnd(48)} | ${scoreOf(counts).toFixed(2).padStart(7)} | ${String(sum(counts, ["Killed"])).padStart(8)} | ${String(sum(counts, ["Timeout"])).padStart(9)} | ${String(sum(counts, ["Survived"])).padStart(10)} | ${String(sum(counts, ["NoCoverage"])).padStart(11)}`;

/** The clear-text report: a table in Stryker's layout, then the shard count and the wall time of the longest shard. */
export const formatLog = (summary, { shards, minutes }) =>
  [
    `Mutation testing report (${shards} shards)`,
    `${"File".padEnd(48)} | % score | # killed | # timeout | # survived | # no cov`,
    row("All files", summary.total),
    ...summary.files.map((file) => row(file.path, file.counts)),
    "",
    `Wall time (longest shard): ${minutes} min`,
  ].join("\n");

/** The shards (1-based) that have no report among the shard numbers found. */
export const missingShards = (found, shards) =>
  Array.from({ length: shards }, (_, i) => i + 1).filter((n) => !found.includes(String(n)));

const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));

/** Reads the shard reports in `dir`, merges them and decides pass or fail. Never throws: a problem is part of the log. */
export const run = ({ dir, shards, breakAt }) => {
  const problems = [];
  const reports = [];
  const seconds = [];
  for (let n = 1; n <= shards; n++) {
    const shardDir = join(dir, `mutation-shard-${n}`);
    const reportPath = join(shardDir, "mutation.json");
    if (!existsSync(reportPath)) {
      problems.push(`Shard ${n} produced no report (${reportPath} is missing): the shard failed, timed out or was cancelled.`);
      continue;
    }
    try {
      reports.push(readJson(reportPath));
      seconds.push(existsSync(join(shardDir, "meta.json")) ? Number(readJson(join(shardDir, "meta.json")).seconds) : 0);
    } catch (error) {
      problems.push(`Shard ${n} has an unreadable report: ${error.message}`);
    }
  }
  const summary = summarise(reports);
  const minutes = Math.round((Math.max(0, ...seconds.filter(Number.isFinite)) / 60) * 10) / 10;
  const score = scoreOf(summary.total);
  if (problems.length === 0 && score < breakAt) {
    problems.push(`Mutation score ${score.toFixed(2)} is below the break threshold of ${breakAt}.`);
  }
  const log = [formatLog(summary, { shards, minutes }), ...problems].join("\n");
  return { ok: problems.length === 0, log, score, minutes };
};

const argsOf = (argv) => {
  const args = {};
  for (let i = 0; i < argv.length; i += 2) args[argv[i].replace(/^--/, "")] = argv[i + 1];
  return args;
};

/** The break threshold of the single-job config, so the merged score is judged by the same number. */
const configuredBreak = () => JSON.parse(readFileSync("stryker.config.json", "utf8")).thresholds.break;

const main = (argv) => {
  const args = argsOf(argv);
  const result = run({ dir: args.in, shards: Number(args.shards), breakAt: Number(args.break ?? configuredBreak()) });
  console.log(result.log);
  if (args.out) writeFileSync(args.out, `${result.log}\n`);
  if (!result.ok) process.exitCode = 1;
};

if (process.argv[1] === fileURLToPath(import.meta.url)) main(process.argv.slice(2));
