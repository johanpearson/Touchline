import { describe, expect, it } from "vitest";
// @ts-expect-error plain Node module with no type declarations
import * as status from "./nightly-status.mjs";

const context = { date: "2026-11-16", sha: "abc1234", ref: "main", runUrl: "https://example.test/run/1" };
const result = (over: Record<string, unknown>) => status.makeResult({ ...context, outcome: "success", job: "balance", ...over });

const balanceLog = [
  "stdout | src/engine/action/action.balance.test.ts",
  "**v2: average vs average** (1000 matches)",
  "",
  "| Metric | Per match | Home | Away |",
  "|---|---|---|---|",
  "| Goals | 2.71 | 1.52 | 1.19 |",
  "| Shots | 24.3 | 12.9 | 11.4 |",
  "| Home / draw / away | 45.2% / 26.1% / 28.7% | | |",
].join("\n");

describe("parseBalanceLog", () => {
  it("reads goals, shots and the home win rate from the average-vs-average table", () => {
    expect(status.parseBalanceLog(balanceLog)).toEqual({ goalsPerMatch: 2.71, shotsPerMatch: 24.3, homeWinPercent: 45.2 });
  });
  it("ignores colour codes", () => {
    const coloured = balanceLog.replace("| Goals", "\x1b[32m| Goals\x1b[0m");
    expect(status.parseBalanceLog(coloured)).toEqual(status.parseBalanceLog(balanceLog));
  });
  it("returns null when the table is missing", () => {
    expect(status.parseBalanceLog("FAIL something")).toBeNull();
  });
});

describe("parseMutationScore", () => {
  it("reads the All files score", () => {
    const log = "File            | % score | # killed |\nAll files       |   98.86 |      203 |";
    expect(status.parseMutationScore(log)).toBe(98.86);
  });
  it("returns null without a report", () => {
    expect(status.parseMutationScore("mutation testing not set up yet")).toBeNull();
  });
});

describe("parseMutationMinutes", () => {
  it("reads the wall time of the longest shard", () => {
    expect(status.parseMutationMinutes("All files | 90.00 |\n\nWall time (longest shard): 47.6 min")).toBe(47.6);
  });
  it("returns null for a single-job log", () => {
    expect(status.parseMutationMinutes("All files       |   98.86 |      203 |")).toBeNull();
  });
});

describe("badges and status entries", () => {
  it("makes a passing balance job green with the key numbers", () => {
    const r = result({ metrics: { goalsPerMatch: 2.71, shotsPerMatch: 24.3, homeWinPercent: 45.2 } });
    expect(status.toBadge(r)).toEqual({ schemaVersion: 1, label: "balance", message: "pass, 2.71 goals, 24.3 shots, 45% home", color: "brightgreen" });
    expect(status.toStatusEntry(r)).toMatchObject({ job: "balance", status: "pass", sha: "abc1234", runUrl: context.runUrl, metrics: { goalsPerMatch: 2.71 } });
  });

  it.each([
    [98.86, "brightgreen"],
    [80, "brightgreen"],
    [79.99, "yellow"],
    [60, "yellow"],
    [59.99, "red"],
  ])("colours a mutation score of %s as %s", (mutationScore, color) => {
    expect(status.toBadge(result({ job: "mutation", metrics: { mutationScore } })).color).toBe(color);
  });

  it("shows the mutation score as the message", () => {
    expect(status.toBadge(result({ job: "mutation", metrics: { mutationScore: 98.86 } })).message).toBe("98.9%");
  });

  it("names the job in a red low-score badge", () => {
    expect(status.toBadge(result({ job: "mutation", metrics: { mutationScore: 41 } })).message).toBe("mutation 41.0% below 60%");
  });

  it.each(status.JOBS.map((j: { key: string; label: string }) => [j.key, j.label]))("names the failing job %s in a red badge", (job, label) => {
    const badge = status.toBadge(result({ job, outcome: "failure" }));
    expect(badge.color).toBe("red");
    expect(badge.message).toBe(`${label} failed`);
    expect(status.toStatusEntry(result({ job, outcome: "failure" })).status).toBe("red");
  });

  it("makes a cancelled or skipped job grey, not red", () => {
    expect(status.toBadge(result({ outcome: "cancelled" }))).toMatchObject({ color: "lightgrey", message: "balance not run" });
  });

  it("makes a passing job without metrics plainly green", () => {
    expect(status.toBadge(result({ job: "e2e" }))).toMatchObject({ message: "pass", color: "brightgreen" });
  });
});

describe("buildStatus and buildFiles", () => {
  const results = [result({ job: "balance" }), result({ job: "mutation", outcome: "failure" }), result({ job: "property" })];

  it("lists every nightly job in README order and names the failing ones", () => {
    const s = status.buildStatus(results, context);
    expect(s.jobs.map((j: { job: string }) => j.job)).toEqual(["balance", "mutation", "property", "e2e"]);
    expect(s).toMatchObject({ ok: false, failing: ["mutation"], sha: "abc1234", updated: "2026-11-16" });
  });

  it("shows a job without a result as not run instead of dropping it", () => {
    const s = status.buildStatus(results, context);
    expect(s.jobs[3]).toMatchObject({ job: "e2e", status: "unknown", message: "e2e not run" });
  });

  it("is ok when no job is red", () => {
    expect(status.buildStatus([result({})], context).ok).toBe(true);
  });

  it("writes status.json and one badge file per job", () => {
    const files = status.buildFiles(results, context);
    expect(Object.keys(files)).toEqual(["status.json", "badge-balance.json", "badge-mutation.json", "badge-property.json", "badge-e2e.json"]);
    expect(JSON.parse(files["badge-mutation.json"])).toEqual({ schemaVersion: 1, label: "mutation", message: "mutation failed", color: "red" });
  });
});
