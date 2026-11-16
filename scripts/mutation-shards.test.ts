import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
// @ts-expect-error plain Node module with no type declarations
import * as shards from "./mutation-shards.mjs";

const files = (...entries: [string, number][]) => entries.map(([path, weight]) => ({ path, weight }));

describe("matchesPattern", () => {
  it.each([
    ["src/engine/**/*.ts", "src/engine/rng.ts", true],
    ["src/engine/**/*.ts", "src/engine/action/play-action.ts", true],
    ["src/engine/**/*.ts", "src/game/rng.ts", false],
    ["src/engine/**/*.ts", "src/engine/rng.tsx", false],
    ["src/engine/**/*.test.ts", "src/engine/action/play-action.test.ts", true],
    ["src/engine/**/*.test.ts", "src/engine/action/play-action.ts", false],
    ["src/engine/index.ts", "src/engine/index.ts", true],
    ["src/engine/index.ts", "src/engine/action/index.ts", false],
    ["src/engine/action/*-builders.ts", "src/engine/action/action-event-builders.ts", true],
    ["src/engine/action/*-builders.ts", "src/engine/action/deep/x-builders.ts", false],
  ])("%s against %s is %s", (pattern, path, expected) => {
    expect(shards.matchesPattern(pattern, path)).toBe(expected);
  });
});

describe("selectMutated", () => {
  const patterns = ["src/engine/**/*.ts", "!src/engine/**/*.test.ts", "!src/engine/index.ts"];

  it("keeps the files that match a pattern and no exclusion", () => {
    const all = [
      "src/engine/rng.ts",
      "src/engine/rng.test.ts",
      "src/engine/index.ts",
      "src/engine/action/play-action.ts",
      "src/game/career.ts",
    ];
    expect(shards.selectMutated(all, patterns)).toEqual(["src/engine/action/play-action.ts", "src/engine/rng.ts"]);
  });

  it("returns the files sorted, so every run sees the same list", () => {
    expect(shards.selectMutated(["src/engine/b.ts", "src/engine/a.ts"], patterns)).toEqual(["src/engine/a.ts", "src/engine/b.ts"]);
  });
});

describe("assignShards", () => {
  it("puts every file in exactly one shard", () => {
    const input = files(["a", 50], ["b", 40], ["c", 30], ["d", 20], ["e", 10], ["f", 5], ["g", 1]);
    const result: string[][] = shards.assignShards(input, 3);
    expect(result).toHaveLength(3);
    expect(result.flat().sort()).toEqual(["a", "b", "c", "d", "e", "f", "g"]);
  });

  it("balances the weight: the heaviest shard is within 10 of a perfect split", () => {
    const input = files(["a", 90], ["b", 80], ["c", 70], ["d", 60], ["e", 50], ["f", 40], ["g", 30], ["h", 20], ["i", 10]);
    const result: string[][] = shards.assignShards(input, 3);
    const weightOf = (paths: string[]) => paths.reduce((sum, p) => sum + (input.find((f) => f.path === p)?.weight ?? 0), 0);
    const loads = result.map(weightOf);
    const perfect = 450 / 3;
    expect(Math.max(...loads)).toBeLessThanOrEqual(perfect + 10);
    expect(Math.min(...loads)).toBeGreaterThanOrEqual(perfect - 10);
  });

  it("gives the same shards for the same input, whatever the input order", () => {
    const input = files(["a", 5], ["b", 5], ["c", 5], ["d", 5]);
    expect(shards.assignShards([...input].reverse(), 2)).toEqual(shards.assignShards(input, 2));
  });

  it("keeps an empty shard when there are fewer files than shards", () => {
    const result: string[][] = shards.assignShards(files(["a", 1]), 3);
    expect(result.map((s) => s.length).sort()).toEqual([0, 0, 1]);
  });

  it("rejects a shard count that is not a positive integer", () => {
    expect(() => shards.assignShards(files(["a", 1]), 0)).toThrow(RangeError);
    expect(() => shards.assignShards(files(["a", 1]), 1.5)).toThrow(RangeError);
  });
});

describe("shardFiles", () => {
  it("returns the files of one shard, counted from 1", () => {
    const input = files(["a", 3], ["b", 2], ["c", 1]);
    expect(shards.shardFiles(input, 1, 2)).toEqual(["a"]);
    expect(shards.shardFiles(input, 2, 2)).toEqual(["b", "c"]);
  });

  it("rejects a shard outside 1..of", () => {
    expect(() => shards.shardFiles(files(["a", 1]), 0, 2)).toThrow(RangeError);
    expect(() => shards.shardFiles(files(["a", 1]), 3, 2)).toThrow(RangeError);
  });
});

/** The real engine: the shards the nightly workflow runs must cover exactly the files Stryker would mutate. */
describe("the nightly shards of the real engine", () => {
  const walk = (dir: string): string[] =>
    readdirSync(dir).flatMap((name) => {
      const path = join(dir, name);
      return statSync(path).isDirectory() ? walk(path) : [path];
    });
  const patterns: string[] = JSON.parse(readFileSync("stryker.config.json", "utf8")).mutate;
  const mutated: string[] = shards.selectMutated(walk("src/engine"), patterns);
  const weighted = mutated.map((path) => ({ path, weight: statSync(path).size }));

  it("mutates the engine files and leaves out tests, the public index and test support", () => {
    expect(mutated).toContain("src/engine/action/play-action.ts");
    expect(mutated).toContain("src/engine/rng.ts");
    expect(mutated.some((p) => p.endsWith(".test.ts"))).toBe(false);
    expect(mutated).not.toContain("src/engine/index.ts");
    expect(mutated).not.toContain("src/engine/action/arbitraries.ts");
    expect(mutated).not.toContain("src/engine/action/action-event-builders.ts");
    expect(mutated).not.toContain("src/engine/action/balance-test-support.ts");
  });

  it.each([4, 6, 8])("covers every mutated file exactly once with %s shards", (count) => {
    const all = Array.from({ length: count }, (_, i) => shards.shardFiles(weighted, i + 1, count)).flat();
    expect(all.sort()).toEqual([...mutated].sort());
  });

  it("splits the work so that no shard is much heavier than the average with 8 shards", () => {
    const sizeOf = (paths: string[]) => paths.reduce((sum, p) => sum + (statSync(p).size ?? 0), 0);
    const loads = Array.from({ length: 8 }, (_, i) => sizeOf(shards.shardFiles(weighted, i + 1, 8)));
    const average = loads.reduce((a, b) => a + b, 0) / loads.length;
    expect(Math.max(...loads)).toBeLessThanOrEqual(average * 1.25);
    expect(Math.min(...loads)).toBeGreaterThan(0);
  });
});
