import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const ci = readFileSync(".github/workflows/ci.yml", "utf8");
const baselines = readFileSync(".github/workflows/visual-baselines.yml", "utf8");
const config = readFileSync("playwright.visual.config.ts", "utf8");
const pkg = JSON.parse(readFileSync("package.json", "utf8")) as { scripts: Record<string, string> };

/** The `visual-scope` to `visual` part of ci.yml, up to the next job. */
const visualJobs = ci.slice(ci.indexOf("  visual-scope:"), ci.indexOf("  pr-title:"));

describe("visual regression setup (#253)", () => {
  it("has a path-filtered, sharded CI job with a final `Visual` check that uploads the report", () => {
    expect(ci).toMatch(/\n {2}visual-scope:/);
    expect(ci).toContain("src/ui/");
    expect(ci).toContain("e2e/visual/");
    expect(ci).toMatch(/\n {2}visual:\n {4}name: Visual\n/);
    expect(ci).toContain("--shard=${{ matrix.shard }}/4");
    expect(ci).toMatch(/shard: \[1, 2, 3, 4\]/);
    expect(ci).toContain("name: visual-report-${{ matrix.shard }}");
  });

  it("reports differences on a pull request without ever failing it", () => {
    expect(visualJobs).toContain("continue-on-error: true");
    expect(visualJobs).not.toMatch(/exit 1/);
    expect(visualJobs).toContain("::warning::");
  });

  it("does not run the comparison on pushes to main, where the baselines are being regenerated", () => {
    expect(visualJobs).toContain('if [ "$EVENT" = "pull_request" ]');
    expect(visualJobs).toMatch(/run=false\n/);
  });

  it("regenerates baselines on CI after a push to main and merges them through a pull request", () => {
    expect(baselines).toContain("workflow_dispatch:");
    expect(baselines).toMatch(/push:\n\s+branches: \[main\]/);
    expect(baselines).toContain("!e2e/visual/__screenshots__/**");
    expect(baselines).toContain("--update-snapshots");
    expect(baselines).toContain("bot/visual-baselines");
    expect(baselines).toContain("gh pr merge");
    expect(baselines).toContain("--auto --squash");
  });

  it("uses a GitHub App token so the baseline pull request starts CI, and skips with a warning without it", () => {
    expect(baselines).toContain("actions/create-github-app-token@v2");
    expect(baselines).toContain("secrets.APP_ID");
    expect(baselines).toContain("secrets.APP_PRIVATE_KEY");
    expect(baselines).not.toContain("BOT_TOKEN");
    expect(baselines).toContain("::warning::Secrets APP_ID and APP_PRIVATE_KEY are not set");
  });

  it("writes baselines without a platform suffix and keeps tolerance explicit", () => {
    expect(config).toContain('snapshotPathTemplate: "{testDir}/__screenshots__/{arg}{ext}"');
    expect(config).toContain("maxDiffPixelRatio");
    expect(config).toContain("threshold: 0.1");
  });

  it("offers the test and update commands", () => {
    expect(pkg.scripts["test:visual"]).toContain("playwright.visual.config.ts");
    expect(pkg.scripts["test:visual:update"]).toContain("--update-snapshots");
  });
});
