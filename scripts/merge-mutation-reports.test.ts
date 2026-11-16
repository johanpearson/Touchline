import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
// @ts-expect-error plain Node module with no type declarations
import * as merge from "./merge-mutation-reports.mjs";
// @ts-expect-error plain Node module with no type declarations
import * as status from "./nightly-status.mjs";

const report = (files: Record<string, string[]>) => ({
  schemaVersion: "2",
  files: Object.fromEntries(
    Object.entries(files).map(([path, statuses]) => [path, { language: "typescript", source: "", mutants: statuses.map((s, i) => ({ id: String(i), status: s })) }]),
  ),
});

describe("scoreOf", () => {
  it("counts killed and timeout mutants as detected, survived and no-coverage mutants as undetected", () => {
    const counts = { Killed: 6, Timeout: 2, Survived: 1, NoCoverage: 1, CompileError: 4, RuntimeError: 3, Ignored: 2 };
    expect(merge.scoreOf(counts)).toBeCloseTo(80);
  });

  it("is 100 for a run without valid mutants, so an empty shard does not fail the job", () => {
    expect(merge.scoreOf({ CompileError: 3 })).toBe(100);
  });
});

describe("summarise", () => {
  it("adds the statuses of the same file and of different files across shards", () => {
    const one = report({ "src/engine/a.ts": ["Killed", "Survived"] });
    const two = report({ "src/engine/b.ts": ["Killed", "Killed", "Timeout"] });

    const summary = merge.summarise([one, two]);

    expect(summary.total).toEqual({ Killed: 3, Survived: 1, Timeout: 1 });
    expect(summary.files.map((f: { path: string }) => f.path)).toEqual(["src/engine/a.ts", "src/engine/b.ts"]);
    expect(merge.scoreOf(summary.files[0].counts)).toBeCloseTo(50);
  });
});

describe("formatLog", () => {
  const summary = merge.summarise([report({ "src/engine/a.ts": ["Killed", "Killed", "Killed", "Survived"], "src/engine/b.ts": ["Killed"] })]);
  const log = merge.formatLog(summary, { shards: 8, minutes: 47.6 });

  it("prints the All files score where the nightly status script reads it", () => {
    expect(status.parseMutationScore(log)).toBe(80);
  });

  it("prints every file with its score, and the shard count", () => {
    expect(log).toContain("src/engine/a.ts");
    expect(log).toMatch(/src\/engine\/a\.ts\s*\|\s*75\.00/);
    expect(log).toContain("8 shards");
  });

  it("prints the wall time of the longest shard where the status script reads it", () => {
    expect(status.parseMutationMinutes(log)).toBe(47.6);
  });
});

describe("checkShards", () => {
  it("lists the shards without a report", () => {
    expect(merge.missingShards(["1", "3"], 4)).toEqual([2, 4]);
  });

  it("finds none when every shard has a report", () => {
    expect(merge.missingShards(["1", "2", "3"], 3)).toEqual([]);
  });
});

describe("run", () => {
  const write = (dir: string, shard: number, files: Record<string, string[]>, seconds: number) => {
    const shardDir = join(dir, `mutation-shard-${shard}`);
    mkdirSync(shardDir, { recursive: true });
    writeFileSync(join(shardDir, "mutation.json"), JSON.stringify(report(files)));
    writeFileSync(join(shardDir, "meta.json"), JSON.stringify({ seconds }));
  };

  it("passes with the merged score and the longest shard as wall time", () => {
    const dir = mkdtempSync(join(tmpdir(), "mutation-"));
    write(dir, 1, { "src/engine/a.ts": ["Killed", "Killed", "Killed", "Killed"] }, 1800);
    write(dir, 2, { "src/engine/b.ts": ["Killed", "Survived"] }, 3000);

    const result = merge.run({ dir, shards: 2, breakAt: 80 });

    expect(result.ok).toBe(true);
    expect(status.parseMutationScore(result.log)).toBeCloseTo(83.33, 2);
    expect(status.parseMutationMinutes(result.log)).toBe(50);
  });

  it("fails below the break threshold, using the merged score and not one shard's", () => {
    const dir = mkdtempSync(join(tmpdir(), "mutation-"));
    write(dir, 1, { "src/engine/a.ts": ["Survived", "Survived", "Killed"] }, 60);
    write(dir, 2, { "src/engine/b.ts": Array(97).fill("Killed") }, 60);

    expect(merge.run({ dir, shards: 2, breakAt: 80 }).ok).toBe(true);
    const failing = merge.run({ dir, shards: 2, breakAt: 99 });
    expect(failing.ok).toBe(false);
    expect(failing.log).toContain("below the break threshold of 99");
  });

  it("fails and names the shard when a shard left no report", () => {
    const dir = mkdtempSync(join(tmpdir(), "mutation-"));
    write(dir, 1, { "src/engine/a.ts": ["Killed"] }, 60);
    write(dir, 3, { "src/engine/c.ts": ["Killed"] }, 60);

    const result = merge.run({ dir, shards: 3, breakAt: 80 });

    expect(result.ok).toBe(false);
    expect(result.log).toContain("Shard 2 produced no report");
  });

  it("fails when the plan gave no shard count, instead of passing with nothing merged", () => {
    const dir = mkdtempSync(join(tmpdir(), "mutation-"));

    for (const shards of [0, Number.NaN]) {
      const result = merge.run({ dir, shards, breakAt: 80 });
      expect(result.ok).toBe(false);
      expect(result.log).toContain("did not give a shard count");
    }
  });

  it("lists the measured minutes and the files of every shard, slowest first, so the estimates can be refreshed", () => {
    const dir = mkdtempSync(join(tmpdir(), "mutation-"));
    const writeMeta = (shard: number, seconds: number, files: string) => {
      write(dir, shard, { "src/engine/a.ts": ["Killed"] }, seconds);
      writeFileSync(join(dir, `mutation-shard-${shard}`, "meta.json"), JSON.stringify({ seconds, files }));
    };
    writeMeta(1, 600, "src/engine/a.ts");
    writeMeta(2, 3000, "src/engine/b.ts:1-40,src/engine/c.ts");

    const { log } = merge.run({ dir, shards: 2, breakAt: 80 });

    const slow = log.indexOf("shard 2");
    const quick = log.indexOf("shard 1");
    expect(slow).toBeGreaterThan(-1);
    expect(quick).toBeGreaterThan(slow);
    expect(log).toMatch(/shard 2\s+50\.0 min\s+src\/engine\/b\.ts:1-40,src\/engine\/c\.ts/);
  });

  it("fails when a report cannot be read", () => {
    const dir = mkdtempSync(join(tmpdir(), "mutation-"));
    mkdirSync(join(dir, "mutation-shard-1"), { recursive: true });
    writeFileSync(join(dir, "mutation-shard-1", "mutation.json"), "not json");

    const result = merge.run({ dir, shards: 1, breakAt: 80 });

    expect(result.ok).toBe(false);
    expect(result.log).toContain("Shard 1");
  });
});
