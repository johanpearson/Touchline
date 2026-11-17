import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const workflow = readFileSync(".github/workflows/nightly.yml", "utf8");

/** The nightly mutation run is planned and sharded; the plan, the shards and the merge must agree or a report is silently ignored. */
describe("the nightly mutation workflow", () => {
  it("plans the shards in a job and takes the shard matrix from its output, not from a fixed list", () => {
    expect(workflow).toMatch(/\n {2}mutation-plan:\n/);
    expect(workflow).toContain("node scripts/mutation-shards.mjs --plan");
    expect(workflow).toContain("matrix: ${{ fromJSON(needs.mutation-plan.outputs.matrix) }}");
    expect(workflow).not.toMatch(/shard:\s*\[\s*\d/);
  });

  it("hands each shard the files of its matrix entry", () => {
    expect(workflow).toContain("FILES: ${{ matrix.files }}");
    expect(workflow).toContain('--mutate "$FILES"');
  });

  it("merges as many shards as the plan made", () => {
    expect(workflow).toContain("SHARDS: ${{ needs.mutation-plan.outputs.count }}");
    expect(workflow).toMatch(/merge-mutation-reports\.mjs[^\n]*--shards "\$\{SHARDS:-0\}"/);
  });

  it("keeps the job key `mutation` for the merged result that the status job waits for, and merges even after a failed shard", () => {
    expect(workflow).toMatch(/\n {2}mutation:\n {4}name: Mutation testing \(engine\)\n {4}needs: \[mutation-plan, mutation-shard\]\n {4}# [^\n]*\n {4}if: always\(\)/);
    expect(workflow).toMatch(/needs: \[balance-full, mutation, property-tests, e2e-full, visual\]/);
  });

  it("gives every shard at most two hours", () => {
    const shardJob = /mutation-shard:[\s\S]*?timeout-minutes:\s*(\d+)/.exec(workflow);
    expect(Number(shardJob?.[1])).toBeLessThanOrEqual(120);
  });

  it("uploads each shard's report under the name the merge job downloads", () => {
    expect(workflow).toContain("name: mutation-shard-${{ matrix.shard }}");
    expect(workflow).toContain("pattern: mutation-shard-*");
  });
});
