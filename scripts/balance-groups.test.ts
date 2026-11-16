import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
// @ts-expect-error plain Node module with no type declarations
import * as balance from "./balance-groups.mjs";

const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path.split("\\").join("/")];
  });

const balanceFilesOnDisk = walk("src").filter((path) => path.endsWith(".balance.test.ts")).sort();

describe("the balance groups", () => {
  it("put every balance test file in exactly one group", () => {
    const grouped: string[] = Object.values(balance.BALANCE_GROUPS).flat() as string[];
    expect([...grouped].sort()).toEqual(balanceFilesOnDisk);
    expect(new Set(grouped).size).toBe(grouped.length);
  });

  it("run the 81 tactic combinations (nine files) and the game suites between three and four jobs", () => {
    const names = Object.keys(balance.BALANCE_GROUPS);
    expect(names.length).toBeGreaterThanOrEqual(3);
    expect(names.length).toBeLessThanOrEqual(4);
    const tacticFiles = (Object.values(balance.BALANCE_GROUPS).flat() as string[]).filter((f) => f.includes("action-no-dominant-tactic-"));
    expect(tacticFiles).toHaveLength(9);
  });

  it("find a balance file that belongs to no group", () => {
    expect(balance.ungroupedFiles(["src/a.balance.test.ts", ...balanceFilesOnDisk])).toEqual(["src/a.balance.test.ts"]);
    expect(balance.ungroupedFiles(balanceFilesOnDisk)).toEqual([]);
  });

  it("know the file list of a group and reject an unknown group", () => {
    expect(balance.filesOfGroup("game")).toEqual(balance.BALANCE_GROUPS.game);
    expect(() => balance.filesOfGroup("nope")).toThrow(RangeError);
  });
});

describe("the fast balance groups", () => {
  const all = Object.values(balance.BALANCE_GROUPS).flat() as string[];
  const fastFiles = Object.values(balance.FAST_GROUPS).flat() as string[];

  it("cover every balance file except the 81 tactic combinations, each exactly once", () => {
    const expected = all.filter((f) => !f.includes("action-no-dominant-tactic-"));
    expect([...fastFiles].sort()).toEqual([...expected].sort());
    expect(new Set(fastFiles).size).toBe(fastFiles.length);
  });

  it("keep the formation suite in a job of its own, because it timed out next to the league suites (#292)", () => {
    const formationGroups = Object.values(balance.FAST_GROUPS).filter((files) => (files as string[]).some((f) => f.endsWith("formation.balance.test.ts")));
    expect(formationGroups).toHaveLength(1);
    expect(formationGroups[0]).toHaveLength(1);
  });

  it("are found by name and do not clash with the full groups", () => {
    for (const name of Object.keys(balance.FAST_GROUPS)) {
      expect(balance.filesOfGroup(name)).toEqual(balance.FAST_GROUPS[name]);
      expect(Object.keys(balance.BALANCE_GROUPS)).not.toContain(name);
    }
  });
});

describe("the balance workflows", () => {
  const ci = readFileSync(".github/workflows/ci.yml", "utf8");
  const nightly = readFileSync(".github/workflows/nightly.yml", "utf8");
  const groups = Object.keys(balance.BALANCE_GROUPS);

  it("run one matrix job per group on pull requests", () => {
    const matrix = /balance-shard:[\s\S]*?group:\s*\[([^\]]*)\]/.exec(ci);
    expect((matrix?.[1] ?? "").split(",").map((g) => g.trim())).toEqual(groups);
  });

  it("run one fast job per fast group on pull requests", () => {
    const matrix = /balance-fast:[\s\S]*?group:\s*\[([^\]]*)\]/.exec(ci);
    expect((matrix?.[1] ?? "").split(",").map((g) => g.trim())).toEqual(Object.keys(balance.FAST_GROUPS));
  });

  it("keep a final job named Balance that waits for the shards and the fast run", () => {
    expect(ci).toMatch(/\n {2}balance:\n {4}name: Balance\n/);
    expect(ci).toMatch(/needs: \[balance-scope, balance-fast, balance-shard\]/);
  });

  it("run the same groups in the nightly workflow and keep the job key the status job waits for", () => {
    const matrix = /balance-shard:[\s\S]*?group:\s*\[([^\]]*)\]/.exec(nightly);
    expect((matrix?.[1] ?? "").split(",").map((g) => g.trim())).toEqual(groups);
    expect(nightly).toMatch(/\n {2}balance-full:\n {4}name: Balance \(full\)\n {4}needs: balance-shard/);
  });
});

describe("the nightly balance log", () => {
  it("is built from the shard logs, each marked with its group", () => {
    const merged = balance.mergeShardLogs([
      { group: "game", outcome: "success", log: "game log" },
      { group: "tactics-attacking", outcome: "failure", log: "FAIL x" },
    ]);
    expect(merged).toContain("game log");
    expect(merged).toContain("FAIL x");
    expect(merged).toContain("::group::game (success)");
    expect(merged).toContain("::group::tactics-attacking (failure)");
  });

  it("names the failed groups", () => {
    expect(
      balance.failedGroups([
        { group: "game", outcome: "success" },
        { group: "tactics-balanced", outcome: "failure" },
        { group: "tactics-defensive", outcome: "cancelled" },
      ]),
    ).toEqual(["tactics-balanced", "tactics-defensive"]);
  });
});
