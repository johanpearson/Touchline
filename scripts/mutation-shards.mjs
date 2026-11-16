#!/usr/bin/env node
// Splits the files Stryker mutates into shards of similar work, so the nightly mutation job can run them in parallel.
// The file list comes from `mutate` in stryker.config.json and the file system, so a new engine file lands in a shard by itself
// and no file can drop out of the nightly run. The functions are pure and tested in mutation-shards.test.ts.
//
// The shards balance estimated minutes (scripts/mutation-weights.json), not file size: a file's cost depends on how many slow
// whole-match tests cover it, and a file above `maxUnitMinutes` is cut into line ranges at top-level declarations.
//
//   node scripts/mutation-shards.mjs --plan               prints `matrix=<json>` and `count=<n>` for $GITHUB_OUTPUT (the nightly workflow)
//   node scripts/mutation-shards.mjs --table              prints the plan as a table to stderr (add --plan to get both)
//   node scripts/mutation-shards.mjs --list               prints every mutated file with its size in bytes
//   node scripts/mutation-shards.mjs --shard 3 --of 8     prints the files of shard 3 of an even split by size (the earlier plan)
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

/**
 * The 1-based numbers of the lines where a top-level declaration (or its doc comment) starts: not indented, not a closing
 * bracket, and right after a blank line. A mutant never spans two of these, so cutting a file there loses none.
 */
export const topLevelStarts = (lines) =>
  lines.flatMap((line, i) => (i > 0 && lines[i - 1].trim() === "" && line !== "" && !/^[\s})\]]/.test(line) ? [i + 1] : []));

/**
 * `path` as `parts` Stryker ranges (`path:from-to`, lines counted from 1, inclusive) that tile the file, each part starting at a
 * top-level declaration and the parts of about the same number of lines. A file that cannot be cut (one big function, too few
 * declarations) gives fewer parts, down to the plain path.
 */
export const splitRanges = (path, source, parts) => {
  const lines = source.split("\n");
  const lineCount = source.endsWith("\n") ? lines.length - 1 : lines.length;
  const starts = topLevelStarts(lines).filter((start) => start > 1 && start <= lineCount);
  const cutsFor = (count) => {
    const cuts = [];
    for (let part = 1; part < count; part++) {
      const wanted = Math.round((lineCount * part) / count);
      const free = starts.filter((s) => !cuts.includes(s));
      if (free.length === 0) return cuts;
      cuts.push(free.reduce((best, s) => (Math.abs(s - wanted) < Math.abs(best - wanted) ? s : best)));
    }
    return cuts.sort((a, b) => a - b);
  };
  // Try the asked number of parts, then fewer, and take the first whose parts are all within 1.5 times the average size: a few
  // top-level declarations around one big function would give a tiny part and a huge one.
  for (let count = parts; count > 1; count--) {
    const cuts = cutsFor(count);
    const bounds = [1, ...cuts, lineCount + 1];
    const sizes = bounds.slice(0, -1).map((from, i) => bounds[i + 1] - from);
    if (cuts.length === count - 1 && Math.max(...sizes) <= 1.5 * (lineCount / count)) {
      return bounds.slice(0, -1).map((from, i) => `${path}:${from}-${bounds[i + 1] - 1}`);
    }
  }
  return [path];
};

/** Stryker work as `{ path, weight }` units: a file above `maxUnitMinutes` is cut into ranges that share its minutes by lines. */
export const unitsOf = ({ path, minutes, source }, maxUnitMinutes) => {
  const parts = Math.ceil(minutes / maxUnitMinutes);
  const specs = parts > 1 ? splitRanges(path, source, parts) : [path];
  if (specs.length === 1) return [{ path: specs[0], weight: minutes }];
  const lineCount = source.endsWith("\n") ? source.split("\n").length - 1 : source.split("\n").length;
  return specs.map((spec) => {
    const [, from, to] = /:(\d+)-(\d+)$/.exec(spec);
    return { path: spec, weight: (minutes * (Number(to) - Number(from) + 1)) / lineCount };
  });
};

/** The estimated minutes of a file: the committed estimate, or for a file that is not listed yet its size times a default. */
export const minutesOf = (path, bytes, weights) => weights.minutes[path] ?? (bytes / 1000) * weights.defaultMinutesPerKb;

export const PLAN_DEFAULTS = { maxUnitMinutes: 25, targetShardMinutes: 30, maxShards: 16, shardOverheadMinutes: 5 };

/**
 * Spreads units over the fewest shards that keep each near `targetShardMinutes` (at most `maxShards`), heaviest unit first into
 * the lightest shard. Each shard also pays `shardOverheadMinutes` (checkout, install, the initial test run).
 */
export const planShards = (units, options = PLAN_DEFAULTS) => {
  const { targetShardMinutes, maxShards, shardOverheadMinutes } = { ...PLAN_DEFAULTS, ...options };
  const work = units.reduce((sum, unit) => sum + unit.weight, 0);
  const wanted = Math.ceil(work / Math.max(1, targetShardMinutes - shardOverheadMinutes));
  const count = Math.max(1, Math.min(maxShards, wanted, units.length));
  const files = assignShards(units, count);
  const weightOf = new Map(units.map((u) => [u.path, u.weight]));
  return {
    count,
    shards: files.map((paths, i) => ({
      shard: i + 1,
      files: paths,
      minutes: paths.reduce((sum, p) => sum + weightOf.get(p), shardOverheadMinutes),
    })),
  };
};

/** The plan for a list of `{ path, weight: bytes }` files read from disk: estimates, then ranges for the big ones, then shards. */
export const planFor = (files, weights, options = PLAN_DEFAULTS) => {
  const { maxUnitMinutes } = { ...PLAN_DEFAULTS, ...options };
  const units = files.flatMap(({ path, weight: bytes }) =>
    unitsOf({ path, minutes: minutesOf(path, bytes, weights), source: readFileSync(path, "utf8") }, maxUnitMinutes),
  );
  return planShards(units, options);
};

/** The two lines of `$GITHUB_OUTPUT`: the job matrix (one `{ shard, files }` entry per shard) and the shard count. */
export const githubOutput = (plan) => {
  const include = plan.shards.map(({ shard, files }) => ({ shard, files: files.join(",") }));
  return `matrix=${JSON.stringify({ include })}\ncount=${plan.count}\n`;
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
  if (args.plan || args.table) {
    const plan = planFor(files, JSON.parse(readFileSync("scripts/mutation-weights.json", "utf8")));
    if (args.plan) process.stdout.write(githubOutput(plan));
    if (args.table) {
      for (const { shard, files: specs, minutes } of plan.shards) {
        console.error(`shard ${String(shard).padStart(2)}  ~${minutes.toFixed(0).padStart(3)} min  ${specs.join(" ")}`);
      }
    }
    return;
  }
  if (args.shard === undefined || args.of === undefined) {
    console.error("usage: mutation-shards.mjs --plan | --table | --list | --shard <1..N> --of <N>");
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
