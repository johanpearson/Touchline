import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const ci = readFileSync(".github/workflows/ci.yml", "utf8");
const nightly = readFileSync(".github/workflows/nightly.yml", "utf8");
const baselines = readFileSync(".github/workflows/visual-baselines.yml", "utf8");
const config = readFileSync("playwright.visual.config.ts", "utf8");
const pkg = JSON.parse(readFileSync("package.json", "utf8")) as { scripts: Record<string, string> };

/** The `visual-scope` to `visual` part of ci.yml, up to the next job. */
const visualJobs = ci.slice(ci.indexOf("  visual-scope:"), ci.indexOf("  pr-title:"));

describe("visual regression on PRs: a small smoke run (#351)", () => {
  it("has a path-filtered smoke job with a final `Visual` check that uploads the report", () => {
    expect(ci).toMatch(/\n {2}visual-scope:/);
    expect(ci).toContain("src/ui/");
    expect(ci).toContain("e2e/visual/");
    expect(ci).toMatch(/\n {2}visual:\n {4}name: Visual\n/);
    expect(ci).toMatch(/\n {2}visual-smoke:\n {4}name: Visual smoke\n/);
    expect(visualJobs).toContain("name: visual-report");
  });

  it("runs only the smoke set and builds only the app, not Storybook", () => {
    expect(visualJobs).toContain('VISUAL_SMOKE: "1"');
    expect(visualJobs).not.toContain("storybook build");
    expect(visualJobs).not.toContain("--shard");
    expect(config).toContain('process.env.VISUAL_SMOKE === "1"');
    expect(config).toContain("grep: /@smoke/");
  });

  it("only reports screenshot differences: the comparison step may fail without failing the job", () => {
    expect(visualJobs).toContain("continue-on-error: true");
    expect(visualJobs).toContain("::warning::");
  });

  it("fails the job for a broken screen state, after the report is uploaded, from the JSON report", () => {
    const upload = visualJobs.indexOf("name: visual-report");
    const check = visualJobs.indexOf("node scripts/visual-breakage.mjs visual-results.json");
    expect(upload).toBeGreaterThan(-1);
    expect(check).toBeGreaterThan(upload);
    expect(config).toContain('["json", { outputFile: "visual-results.json" }]');
  });

  it("fails the Visual check only for a failed job, never for a cancelled run or a skipped one", () => {
    const aggregate = visualJobs.slice(visualJobs.indexOf("\n  visual:\n"));
    expect(aggregate).toMatch(/\*cancelled\*\) .*exit 0/);
    expect(aggregate).toMatch(/\*failure\*\) .*exit 1/);
    expect(aggregate.match(/exit 1/g)).toHaveLength(1);
  });

  it("does not run the comparison on pushes to main", () => {
    expect(visualJobs).toContain('if [ "$EVENT" = "pull_request" ]');
    expect(visualJobs).toMatch(/run=false\n/);
  });
});

describe("visual baselines: the full run is part of the nightly workflow (#351)", () => {
  it("is called by the nightly workflow, which waits for it before publishing the status", () => {
    expect(nightly).toMatch(/\n {2}visual:\n {4}name: Visual \(full\)\n[\s\S]*?uses: \.\/\.github\/workflows\/visual-baselines\.yml\n {4}secrets: inherit/);
    expect(nightly).toMatch(/needs: \[[^\]]*\bvisual\b[^\]]*\]/);
  });

  it("can be run by hand or called, and never starts from a push, so a merged baseline pull request starts nothing", () => {
    expect(baselines).toContain("workflow_dispatch:");
    expect(baselines).toContain("workflow_call:");
    expect(baselines).not.toMatch(/\n {2}push:/);
    expect(baselines).not.toMatch(/\n {2}schedule:/);
    expect(baselines).toContain("rebuild_all:");
  });

  it("rewrites only baselines that no longer match, and deletes them all only on request", () => {
    expect(baselines).toContain("--update-snapshots=changed");
    expect(baselines).toMatch(/if \[ "\$REBUILD_ALL" = "true" \]; then\n\s+rm -rf e2e\/visual\/__screenshots__/);
  });

  it("opens one self-merging baseline pull request and closes it when nothing is left to change", () => {
    expect(baselines).toContain("bot/visual-baselines");
    expect(baselines).toContain("gh pr merge");
    expect(baselines).toContain("--auto --squash");
    expect(baselines).toContain("gh pr close");
  });

  it("opens an issue and writes the nightly status result for the visual job", () => {
    expect(baselines).toContain("bash scripts/nightly-visual-issue.sh visual.log");
    expect(baselines).toContain("nightly-status.mjs result --job visual");
    expect(baselines).toContain("name: nightly-result-visual");
  });

  it("uses a GitHub App token so the baseline pull request starts CI, and skips with a warning without it", () => {
    expect(baselines).toContain("actions/create-github-app-token@v2");
    expect(baselines).toContain("secrets.APP_ID");
    expect(baselines).toContain("secrets.APP_PRIVATE_KEY");
    expect(baselines).not.toContain("BOT_TOKEN");
    expect(baselines).toContain("::warning::Secrets APP_ID and APP_PRIVATE_KEY are not set");
  });
});

describe("visual regression setup (#253)", () => {
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
