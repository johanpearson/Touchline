import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const workflow = readFileSync(".github/workflows/nightly.yml", "utf8");

/** The nightly mutation run is sharded; the shard list and the merge must agree or a shard's report is silently ignored. */
describe("the nightly mutation workflow", () => {
  const matrix = /mutation-shard:[\s\S]*?shard:\s*\[([^\]]*)\]/.exec(workflow);
  const shards = (matrix?.[1] ?? "").split(",").map((n) => Number(n.trim()));

  it("runs shards numbered 1 to N", () => {
    expect(shards.length).toBeGreaterThan(1);
    expect(shards).toEqual(Array.from({ length: shards.length }, (_, i) => i + 1));
  });

  it("merges exactly as many shards as the matrix runs", () => {
    const merged = /merge-mutation-reports\.mjs[^\n]*--shards\s+(\d+)/.exec(workflow);
    expect(Number(merged?.[1])).toBe(shards.length);
  });

  it("keeps the job key `mutation` for the merged result that the status job waits for", () => {
    expect(workflow).toMatch(/\n {2}mutation:\n {4}name: Mutation testing \(engine\)\n {4}needs: mutation-shard/);
    expect(workflow).toMatch(/needs: \[balance-full, mutation, property-tests, e2e-full\]/);
  });

  it("gives every shard at most two hours", () => {
    const shardJob = /mutation-shard:[\s\S]*?timeout-minutes:\s*(\d+)/.exec(workflow);
    expect(Number(shardJob?.[1])).toBeLessThanOrEqual(120);
  });
});
