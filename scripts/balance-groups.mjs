#!/usr/bin/env node
// The full balance suite split into named groups of similar run time, so CI and the nightly run can play them as parallel jobs.
// `vitest --shard` splits by file count, not by duration, so the groups are explicit. A test (balance-groups.test.ts) fails when
// a `*.balance.test.ts` file belongs to no group, so a new balance test cannot silently drop out of the full run.
//
//   node scripts/balance-groups.mjs run <group>              plays one group (npm run test:balance:group -- <group>)
//   node scripts/balance-groups.mjs merge --in <dir> --out <log>
//                                                            joins the shard logs of the nightly run and fails when a shard failed
import { spawnSync } from "node:child_process";
import { appendFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ENGINE = "src/engine/action";
const GAME = "src/game";
const tactics = (mentality) => ["high", "low", "medium"].map((pressing) => `${ENGINE}/action-no-dominant-tactic-${mentality}-${pressing}.balance.test.ts`);

/** Group name to its balance test files. The game suites are the heaviest; the nine combination files are spread over three groups. */
export const BALANCE_GROUPS = {
  game: [`${GAME}/shout.balance.test.ts`, `${GAME}/formation.balance.test.ts`, `${GAME}/league.balance.test.ts`, `${GAME}/season.balance.test.ts`, `${GAME}/development.balance.test.ts`],
  "tactics-attacking": [...tactics("attacking"), `${ENGINE}/action.balance.test.ts`],
  "tactics-balanced": [...tactics("balanced"), `${ENGINE}/action-strength.balance.test.ts`],
  "tactics-defensive": [...tactics("defensive"), `${ENGINE}/action-tactics.balance.test.ts`],
};

/**
 * The fast subset of the PR gate (everything except the 81 tactic combinations) as parallel jobs, so no job shares its CPUs between the
 * heavy suites: in one job the formation suite hit the 600 s hook timeout next to the league and tactics suites (#292).
 */
export const FAST_GROUPS = {
  "fast-formation": [`${GAME}/formation.balance.test.ts`],
  "fast-league": [`${GAME}/shout.balance.test.ts`, `${GAME}/league.balance.test.ts`, `${GAME}/season.balance.test.ts`],
  "fast-development": [`${GAME}/development.balance.test.ts`],
  "fast-engine": [`${ENGINE}/action.balance.test.ts`, `${ENGINE}/action-strength.balance.test.ts`, `${ENGINE}/action-tactics.balance.test.ts`],
};

/** The files of a full or fast group; throws RangeError for a name that is not a group. */
export const filesOfGroup = (group) => {
  const groups = { ...BALANCE_GROUPS, ...FAST_GROUPS };
  if (!Object.hasOwn(groups, group)) {
    throw new RangeError(`Unknown balance group "${group}". Groups: ${Object.keys(groups).join(", ")}`);
  }
  return groups[group];
};

/** The balance files in `files` that no group lists. */
export const ungroupedFiles = (files) => {
  const grouped = new Set(Object.values(BALANCE_GROUPS).flat());
  return files.filter((file) => !grouped.has(file));
};

/** Shard results (`{ group, outcome }`) that did not succeed, by group name. */
export const failedGroups = (shards) => shards.filter((s) => s.outcome !== "success").map((s) => s.group);

/** One log from the shard logs, each under a `::group::<name> (<outcome>)` line, so the status parser and the issue script read it as before. */
export const mergeShardLogs = (shards) =>
  shards.map((s) => `::group::${s.group} (${s.outcome})\n${s.log}\n::endgroup::\n`).join("\n");

const argsOf = (argv) => {
  const args = {};
  for (let i = 0; i < argv.length; i++) if (argv[i].startsWith("--")) args[argv[i].slice(2)] = argv[i + 1];
  return args;
};

const runGroup = (group) => {
  const files = filesOfGroup(group);
  const command = process.platform === "win32" ? "npx.cmd" : "npx";
  const run = spawnSync(command, ["vitest", "run", "--config", "vitest.balance.config.ts", ...files], { stdio: "inherit" });
  return run.status ?? 1;
};

/** Reads `<in>/balance-shard-<group>/balance.log` and `outcome.txt` (the artifact folders of the nightly shards) of every group; a missing shard counts as failed. */
const merge = (dir, out) => {
  const shards = Object.keys(BALANCE_GROUPS).map((group) => {
    const file = (name) => join(dir, `balance-shard-${group}`, name);
    const read = (name) => (existsSync(file(name)) ? readFileSync(file(name), "utf8").trim() : "");
    return { group, outcome: read("outcome.txt") || "missing", log: read("balance.log") || "No log was uploaded for this shard." };
  });
  writeFileSync(out, mergeShardLogs(shards));
  const failed = failedGroups(shards);
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `failed_groups=${failed.join(", ")}\n`);
  if (failed.length > 0) console.error(`Balance shards that did not succeed: ${failed.join(", ")}`);
  return failed.length === 0 ? 0 : 1;
};

const main = (argv) => {
  const [command, ...rest] = argv;
  if (command === "run") {
    try {
      process.exitCode = runGroup(rest[0] ?? "");
    } catch (error) {
      console.error(error.message);
      process.exitCode = 2;
    }
    return;
  }
  if (command === "merge") {
    const args = argsOf(rest);
    process.exitCode = merge(args.in, args.out);
    return;
  }
  console.error("usage: balance-groups.mjs run <group> | merge --in <dir> --out <log>");
  process.exitCode = 2;
};

if (process.argv[1] === fileURLToPath(import.meta.url)) main(process.argv.slice(2));
