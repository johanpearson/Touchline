import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
// @ts-expect-error plain Node module with no type declarations
import * as shards from "./mutation-shards.mjs";

const source = (blocks: string[]) => `${blocks.join("\n\n")}\n`;
const fn = (name: string, lines = 3) => `export const ${name} = () => {\n${"  work();\n".repeat(lines)}};`;

describe("topLevelStarts", () => {
  it("lists the first line of each top-level declaration that follows a blank line, counted from 1", () => {
    const text = source([`import a from "a";`, "/** Doc. */\nexport const one = 1;", fn("two"), "type T = string;"]);
    // line 1 import, 2 blank, 3-4 doc + one, 5 blank, 6-10 two, 11 blank, 12 type
    expect(shards.topLevelStarts(text.split("\n"))).toEqual([3, 6, 12]);
  });

  it("does not count indented lines or closing braces", () => {
    const text = "export const a = {\n\n  b: 1,\n\n};\n\nexport const c = 2;\n";
    expect(shards.topLevelStarts(text.split("\n"))).toEqual([7]);
  });
});

describe("splitRanges", () => {
  const text = source(Array.from({ length: 8 }, (_, i) => fn(`f${i}`)));
  const lines = text.split("\n");

  it("keeps a file that is not split as one spec", () => {
    expect(shards.splitRanges("src/a.ts", text, 1)).toEqual(["src/a.ts"]);
  });

  it("tiles the file with line ranges that start at declarations: no gap, no overlap, first from 1 and last to the end", () => {
    const specs: string[] = shards.splitRanges("src/a.ts", text, 3);
    expect(specs).toHaveLength(3);
    const ranges = specs.map((s) => /:(\d+)-(\d+)$/.exec(s)).map((m) => [Number(m?.[1]), Number(m?.[2])]);
    expect(ranges[0]?.[0]).toBe(1);
    expect(ranges[ranges.length - 1]?.[1]).toBe(lines.length - 1);
    for (let i = 1; i < ranges.length; i++) expect(ranges[i]?.[0]).toBe((ranges[i - 1]?.[1] ?? 0) + 1);
    const starts = shards.topLevelStarts(lines);
    for (const [start] of ranges.slice(1)) expect(starts).toContain(start);
  });

  it("balances the parts by line count", () => {
    const specs: string[] = shards.splitRanges("src/a.ts", text, 4);
    const sizes = specs.map((s) => {
      const m = /:(\d+)-(\d+)$/.exec(s);
      return Number(m?.[2]) - Number(m?.[1]) + 1;
    });
    expect(Math.max(...sizes) - Math.min(...sizes)).toBeLessThanOrEqual(10);
  });

  it("cannot split inside a declaration, so a file of one big function stays whole", () => {
    const one = `${fn("big", 200)}\n`;
    expect(shards.splitRanges("src/big.ts", one, 4)).toEqual(["src/big.ts"]);
  });

  it("makes fewer parts than asked when there are not enough declarations", () => {
    const two = source([fn("a"), fn("b")]);
    expect(shards.splitRanges("src/two.ts", two, 5)).toHaveLength(2);
  });
});

describe("unitsOf", () => {
  const text = source(Array.from({ length: 10 }, (_, i) => fn(`f${i}`)));

  it("keeps a file below the unit limit as one unit with its estimated minutes", () => {
    expect(shards.unitsOf({ path: "a.ts", minutes: 20, source: text }, 25)).toEqual([{ path: "a.ts", weight: 20 }]);
  });

  it("splits a file above the limit into parts of about the limit and shares the minutes between them", () => {
    const units = shards.unitsOf({ path: "a.ts", minutes: 90, source: text }, 25);
    expect(units).toHaveLength(4);
    expect(units.reduce((sum: number, u: { weight: number }) => sum + u.weight, 0)).toBeCloseTo(90);
    expect(units.every((u: { path: string }) => u.path.startsWith("a.ts:"))).toBe(true);
  });

  it("gives a file that cannot be split all its minutes in one unit", () => {
    const big = `${fn("big", 200)}\n`;
    expect(shards.unitsOf({ path: "b.ts", minutes: 90, source: big }, 25)).toEqual([{ path: "b.ts", weight: 90 }]);
  });
});

describe("minutesOf", () => {
  const weights = { defaultMinutesPerKb: 2, minutes: { "src/known.ts": 7 } };

  it("uses the estimate of a known file", () => {
    expect(shards.minutesOf("src/known.ts", 50_000, weights)).toBe(7);
  });

  it("estimates a new file from its size, so it still gets a fair share", () => {
    expect(shards.minutesOf("src/new.ts", 3000, weights)).toBe(6);
  });
});

describe("planShards", () => {
  const units = [90, 60, 40, 30, 20, 10, 5, 1].map((weight, i) => ({ path: `u${i}`, weight }));

  it("uses as many shards as the work needs for the target minutes, at most the maximum", () => {
    // 256 minutes of work: 6 shards of at most 50, and never more shards than the maximum.
    expect(shards.planShards(units, { targetShardMinutes: 50, maxShards: 16, shardOverheadMinutes: 0 }).count).toBe(6);
    expect(shards.planShards(units, { targetShardMinutes: 10, maxShards: 4, shardOverheadMinutes: 0 }).count).toBe(4);
  });

  it("puts every unit in exactly one shard and numbers the shards from 1", () => {
    const plan = shards.planShards(units, { targetShardMinutes: 50, maxShards: 16, shardOverheadMinutes: 0 });
    expect(plan.shards.map((s: { shard: number }) => s.shard)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(plan.shards.flatMap((s: { files: string[] }) => s.files).sort()).toEqual(units.map((u) => u.path).sort());
  });

  it("adds the setup time of a shard to its minutes", () => {
    const plan = shards.planShards(units, { targetShardMinutes: 100, maxShards: 16, shardOverheadMinutes: 5 });
    const total = plan.shards.reduce((sum: number, s: { minutes: number }) => sum + s.minutes, 0);
    expect(total).toBeCloseTo(units.reduce((s, u) => s + u.weight, 0) + 5 * plan.count);
  });

  it("is deterministic", () => {
    const options = { targetShardMinutes: 50, maxShards: 16, shardOverheadMinutes: 3 };
    expect(shards.planShards([...units].reverse(), options)).toEqual(shards.planShards(units, options));
  });

  it("never plans an empty shard", () => {
    const plan = shards.planShards([{ path: "a", weight: 1 }], { targetShardMinutes: 1, maxShards: 8, shardOverheadMinutes: 0 });
    expect(plan.count).toBe(1);
    expect(plan.shards[0].files).toEqual(["a"]);
  });
});

describe("githubOutput", () => {
  it("prints the matrix as JSON and the count, one `name=value` per line", () => {
    const plan = { count: 2, shards: [{ shard: 1, files: ["a.ts", "b.ts:1-9"], minutes: 20 }, { shard: 2, files: ["c.ts"], minutes: 10 }] };
    const lines = shards.githubOutput(plan).trim().split("\n");
    expect(lines).toHaveLength(2);
    expect(lines[1]).toBe("count=2");
    const matrix = JSON.parse((lines[0] ?? "").replace(/^matrix=/, ""));
    expect(matrix).toEqual({
      include: [
        { shard: 1, files: "a.ts,b.ts:1-9" },
        { shard: 2, files: "c.ts" },
      ],
    });
  });
});

/** The real engine with the committed estimates: what the nightly workflow will run. */
describe("the nightly plan of the real engine", () => {
  const weights = JSON.parse(readFileSync("scripts/mutation-weights.json", "utf8"));
  const walk = (dir: string): string[] =>
    readdirSync(dir).flatMap((name) => {
      const path = join(dir, name);
      return statSync(path).isDirectory() ? walk(path) : [path];
    });
  const patterns: string[] = JSON.parse(readFileSync("stryker.config.json", "utf8")).mutate;
  const mutated: string[] = shards.selectMutated(walk("src/engine"), patterns);
  const plan = shards.planFor(shards.mutatedFiles(), weights);

  it("has an estimate for every mutated file, so the weights file is not stale", () => {
    const missing = mutated.filter((path) => weights.minutes[path] === undefined);
    expect(missing).toEqual([]);
  });

  it("has no estimate for a file that no longer exists", () => {
    const stale = Object.keys(weights.minutes).filter((path) => !mutated.includes(path));
    expect(stale).toEqual([]);
  });

  it("covers every mutated file: whole in one shard, or as ranges that tile it", () => {
    const specs: string[] = plan.shards.flatMap((s: { files: string[] }) => s.files);
    for (const path of mutated) {
      const own = specs.filter((spec) => spec === path || spec.startsWith(`${path}:`));
      expect(own.length, path).toBeGreaterThan(0);
      if (own.length === 1) {
        expect(own[0], path).toBe(path);
        continue;
      }
      const lineCount = readFileSync(path, "utf8").split("\n").length - 1;
      const ranges = own.map((s) => /:(\d+)-(\d+)$/.exec(s)).map((m) => [Number(m?.[1]), Number(m?.[2])] as [number, number]);
      ranges.sort((a, b) => a[0] - b[0]);
      expect(ranges[0]?.[0], path).toBe(1);
      expect(ranges[ranges.length - 1]?.[1], path).toBe(lineCount);
      for (let i = 1; i < ranges.length; i++) expect(ranges[i]?.[0], path).toBe((ranges[i - 1]?.[1] ?? 0) + 1);
    }
    expect(specs.filter((s) => !mutated.some((p) => s === p || s.startsWith(`${p}:`)))).toEqual([]);
  });

  it("keeps every shard within 100 estimated minutes, a fifth under the two hour limit, so one wrong estimate does not time a shard out", () => {
    for (const shard of plan.shards) expect(shard.minutes, `shard ${shard.shard}`).toBeLessThanOrEqual(100);
  });

  it("stays within the 20 jobs GitHub runs at the same time on a free plan, next to the other nightly jobs", () => {
    expect(plan.count).toBeLessThanOrEqual(16);
  });
});
