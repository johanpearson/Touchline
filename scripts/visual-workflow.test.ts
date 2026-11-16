import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const ci = readFileSync(".github/workflows/ci.yml", "utf8");
const update = readFileSync(".github/workflows/update-snapshots.yml", "utf8");
const config = readFileSync("playwright.visual.config.ts", "utf8");
const pkg = JSON.parse(readFileSync("package.json", "utf8")) as { scripts: Record<string, string> };

describe("visual regression setup (#253)", () => {
  it("has a path-filtered, sharded CI job with a final `Visual` check that uploads the report on failure", () => {
    expect(ci).toMatch(/\n {2}visual-scope:/);
    expect(ci).toContain("src/ui/");
    expect(ci).toContain("e2e/visual/");
    expect(ci).toMatch(/\n {2}visual:\n {4}name: Visual\n/);
    expect(ci).toContain("--shard=${{ matrix.shard }}/4");
    expect(ci).toMatch(/shard: \[1, 2, 3, 4\]/);
    expect(ci).toContain("name: visual-report-${{ matrix.shard }}");
  });

  it("regenerates baselines on CI only, from a manual run or the `update-snapshots` label, and commits them", () => {
    expect(update).toContain("workflow_dispatch:");
    expect(update).toContain("update-snapshots");
    expect(update).toContain("--update-snapshots");
    expect(update).toContain("git push");
    expect(update).toContain("contents: write");
  });

  it("writes baselines without a platform suffix and keeps tolerance explicit", () => {
    expect(config).toContain('snapshotPathTemplate: "{testDir}/__screenshots__/{arg}{ext}"');
    expect(config).toContain("maxDiffPixelRatio");
    expect(config).toContain("threshold: 0");
  });

  it("offers the test and update commands", () => {
    expect(pkg.scripts["test:visual"]).toContain("playwright.visual.config.ts");
    expect(pkg.scripts["test:visual:update"]).toContain("--update-snapshots");
  });
});
