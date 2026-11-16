#!/usr/bin/env node
// Splits the files Stryker mutates into shards of similar work, so the nightly mutation job can run them in parallel.
// The file list comes from `mutate` in stryker.config.json and the file system, so a new engine file lands in a shard by itself
// and no file can drop out of the nightly run. The functions are pure and tested in mutation-shards.test.ts.
//
//   node scripts/mutation-shards.mjs --shard 3 --of 8     prints the files of shard 3 as a comma-separated list for `stryker --mutate`
//   node scripts/mutation-shards.mjs --list               prints every mutated file with its weight
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const escape = (text) => text.replace(/[.+^${}()|[\]\\]/g, "\\$&");

/** Whether a Stryker-style glob (`**`, `*`, no braces) matches a path with `/` separators. */
export const matchesPattern = (pattern, path) => {
  let source = "";
  for (let i = 0; i < pattern.length; i++) {
    if (pattern.startsWith("**/", i)) {
      source += "(?:.*/)?";
      i += 2;
    } else if (pattern.startsWith("**", i)) {
      source += ".*";
      i += 1;
    } else if (pattern[i] === "*") {
      source += "[^/]*";
    } else {
      source += escape(pattern[i]);
    }
  }
  return new RegExp(`^${source}$`).test(path);
};

/** The sorted paths that match a positive pattern and no `!` exclusion, as Stryker's `mutate` option reads them. */
export const selectMutated = (paths, patterns) => {
  const include = patterns.filter((p) => !p.startsWith("!"));
  const exclude = patterns.filter((p) => p.startsWith("!")).map((p) => p.slice(1));
  return paths
    .filter((path) => include.some((p) => matchesPattern(p, path)) && !exclude.some((p) => matchesPattern(p, path)))
    .sort();
};

/**
 * Spreads `{ path, weight }` entries over `count` shards: the heaviest file first, each into the lightest shard so far
 * (ties by path and by shard index), which keeps the heaviest shard within one file of the average. Deterministic.
 */
export const assignShards = (files, count) => {
  if (!Number.isInteger(count) || count < 1) throw new RangeError(`Shard count must be a positive integer: ${count}`);
  const shards = Array.from({ length: count }, () => ({ load: 0, paths: [] }));
  const ordered = [...files].sort((a, b) => b.weight - a.weight || (a.path < b.path ? -1 : 1));
  for (const { path, weight } of ordered) {
    const lightest = shards.reduce((best, shard) => (shard.load < best.load ? shard : best));
    lightest.load += weight;
    lightest.paths.push(path);
  }
  return shards.map((shard) => shard.paths.sort());
};

/** The files of shard `shard` (1-based) out of `count`. */
export const shardFiles = (files, shard, count) => {
  if (!Number.isInteger(shard) || shard < 1 || shard > count) throw new RangeError(`Shard ${shard} is not in 1..${count}`);
  return assignShards(files, count)[shard - 1];
};

const walk = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path.split("\\").join("/")];
  });

/** Every file Stryker mutates, with its size in bytes as the weight (the number of mutants grows with the code). */
export const mutatedFiles = (configPath = "stryker.config.json", root = "src/engine") => {
  const { mutate } = JSON.parse(readFileSync(configPath, "utf8"));
  return selectMutated(walk(root), mutate).map((path) => ({ path, weight: statSync(path).size }));
};

const argsOf = (argv) => {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    if (!argv[i].startsWith("--")) continue;
    const next = argv[i + 1];
    args[argv[i].slice(2)] = next === undefined || next.startsWith("--") ? true : next;
  }
  return args;
};

const main = (argv) => {
  const args = argsOf(argv);
  const files = mutatedFiles();
  if (args.list) {
    for (const { path, weight } of files) console.log(`${weight}\t${path}`);
    return;
  }
  if (args.shard === undefined || args.of === undefined) {
    console.error("usage: mutation-shards.mjs --shard <1..N> --of <N> | --list");
    process.exitCode = 2;
    return;
  }
  const paths = shardFiles(files, Number(args.shard), Number(args.of));
  if (paths.length === 0) {
    console.error(`Shard ${args.shard} of ${args.of} has no files`);
    process.exitCode = 1;
    return;
  }
  console.log(paths.join(","));
};

if (process.argv[1] === fileURLToPath(import.meta.url)) main(process.argv.slice(2));
