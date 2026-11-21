import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string): string => readFileSync(path, "utf8");
const readJson = (path: string): Record<string, unknown> => JSON.parse(read(path));

describe("mutation testing setup", () => {
  const config = readJson("stryker.config.json");

  it("uses the Vitest runner", () => {
    expect(config.testRunner).toBe("vitest");
  });

  it("only mutates non-test, non-fixture files in src/engine", () => {
    expect(config.mutate).toEqual([
      "src/engine/**/*.ts",
      "!src/engine/**/*.test.ts",
      "!src/engine/index.ts",
      "!src/engine/action/arbitraries.ts",
      "!src/engine/action/performance.bench.ts",
      "!src/engine/action/measure-match-time.ts",
      "!src/engine/action/balance-test-support.ts",
      "!src/engine/action/*-builders.ts",
      "!src/engine/phase/arbitraries.ts",
      "!src/engine/phase/*-builders.ts",
      "!src/engine/phase/simulate-steps.ts",
    ]);
  });

  it("writes an HTML report to reports/mutation", () => {
    expect(config.reporters).toContain("html");
    expect(config.htmlReporter).toEqual({ fileName: "reports/mutation/index.html" });
  });

  it("is started by npm run test:mutation", () => {
    const scripts = readJson("package.json").scripts as Record<string, string>;
    expect(scripts["test:mutation"]).toBe("stryker run");
  });

  it("is run by the nightly workflow in parallel shards that upload their reports and a merge job", () => {
    const nightly = read(".github/workflows/nightly.yml");
    expect(nightly).toContain("stryker run stryker.shard.config.json");
    expect(nightly).toContain("scripts/mutation-shards.mjs");
    expect(nightly).toContain("scripts/merge-mutation-reports.mjs");
    expect(nightly).toContain("path: reports/mutation");
  });

  it("fails the run below 80% for both configs", () => {
    for (const path of ["stryker.config.json", "stryker.action.config.json"]) {
      expect(readJson(path).thresholds).toEqual({ high: 90, low: 85, break: 80 });
    }
  });

  it("gives each nightly mutation shard at most two hours, not the six of the single job", () => {
    const nightly = read(".github/workflows/nightly.yml");
    expect(nightly).toContain("timeout-minutes: 120");
    expect(nightly).not.toContain("timeout-minutes: 360");
  });

  describe("shard config", () => {
    const shard = readJson("stryker.shard.config.json");

    it("mutates what the shard script passes in, so it has no mutate list of its own", () => {
      expect(shard.mutate).toBeUndefined();
    });

    it("has no break threshold, because the merged score is judged and not a shard's", () => {
      expect(shard.thresholds).toEqual({ high: 90, low: 85, break: null });
    });

    it("writes the JSON report the merge job reads", () => {
      expect(shard.reporters).toContain("json");
      expect(shard.jsonReporter).toEqual({ fileName: "reports/mutation/mutation.json" });
    });

    it("runs the same tests the engine-wide config runs", () => {
      expect(shard.testRunner).toBe(config.testRunner);
      expect(shard.vitest).toEqual(config.vitest);
      expect(shard.coverageAnalysis).toBe(config.coverageAnalysis);
    });
  });

  it("keeps generated reports out of git", () => {
    expect(read(".gitignore")).toMatch(/^reports$/m);
  });
  describe("action engine config", () => {
    const action = readJson("stryker.action.config.json");

    it("only mutates non-test, non-fixture files in src/engine/action", () => {
      expect(action.mutate).toEqual([
        "src/engine/action/**/*.ts",
        "!src/engine/action/**/*.test.ts",
        "!src/engine/action/arbitraries.ts",
        "!src/engine/action/performance.bench.ts",
        "!src/engine/action/measure-match-time.ts",
        "!src/engine/action/balance-test-support.ts",
        "!src/engine/action/*-builders.ts",
      ]);
    });

    it("is started by npm run test:mutation:action", () => {
      const scripts = readJson("package.json").scripts as Record<string, string>;
      expect(scripts["test:mutation:action"]).toBe("stryker run stryker.action.config.json");
    });

    it("writes its reports to reports/mutation-action, apart from the engine-wide report", () => {
      expect(action.htmlReporter).toEqual({ fileName: "reports/mutation-action/index.html" });
      expect(action.jsonReporter).toEqual({ fileName: "reports/mutation-action/mutation.json" });
    });

    it("selects its tests with a config that leaves out the whole-match files", () => {
      expect(action.vitest).toEqual({ configFile: "vitest.mutation-action.config.ts" });
      const vitestConfig = read("vitest.mutation-action.config.ts");
      expect(vitestConfig).toContain("fast-detail.test.ts");
      expect(vitestConfig).toContain("action-match.property.test.ts");
      expect(vitestConfig).not.toContain("create-action-match.test.ts");
    });

    it("selects engine tests only, so the engine-wide run skips wall-clock tests in game", () => {
      expect(config.vitest).toEqual({ configFile: "vitest.mutation.config.ts" });
    });
  });
});
