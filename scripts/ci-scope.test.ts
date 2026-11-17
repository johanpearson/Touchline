import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
// @ts-expect-error plain Node module with no type declarations
import * as scope from "./ci-scope.mjs";

const pr = (files: string[], labels: string[] = []) => scope.ciScope({ event: "pull_request", files, labels });

describe("CI scope for a pull request", () => {
  it("runs nothing heavy for a documentation-only change", () => {
    expect(pr(["docs/design.md", "README.md", "reference/ui/board.html"])).toEqual({
      verify: false,
      perf: false,
      storybook: false,
      balance: "none",
      e2eSmoke: false,
      e2eStories: false,
    });
  });

  it("runs the app checks but not balance, perf or the engine for a UI change", () => {
    expect(pr(["src/ui/new-career/club-strip.tsx"])).toEqual({
      verify: true,
      perf: false,
      storybook: true,
      balance: "none",
      e2eSmoke: true,
      e2eStories: true,
    });
  });

  it("plays the full balance suite and the perf budget for an engine change, without Storybook", () => {
    expect(pr(["src/engine/match/zone-engine.ts"])).toEqual({
      verify: true,
      perf: true,
      storybook: false,
      balance: "full",
      e2eSmoke: true,
      e2eStories: false,
    });
  });

  it("plays the fast balance subset for a game-logic change", () => {
    const result = pr(["src/game/league/table.ts"]);
    expect(result.balance).toBe("fast");
    expect(result.perf).toBe(true);
    expect(result.storybook).toBe(false);
  });

  it("plays the full balance suite for a balance test, the balance config or the balance groups", () => {
    for (const file of ["src/engine/x.balance.test.ts", "vitest.balance.config.ts", "scripts/balance-groups.mjs"]) {
      expect(pr([file]).balance).toBe("full");
    }
  });

  it("does not start the app checks for a change to unit tests only", () => {
    const result = pr(["src/ui/new-career/club-step.test.tsx", "src/game/league/table.test.ts"]);
    expect(result.e2eSmoke).toBe(false);
    expect(result.e2eStories).toBe(false);
    expect(result.verify).toBe(true);
  });

  it("runs everything for a change to dependencies, tooling or the CI workflow", () => {
    for (const file of ["package-lock.json", "tsconfig.json", "vite.config.ts", ".github/workflows/ci.yml", "scripts/ci-scope.mjs", "biome.json"]) {
      const result = pr([file]);
      expect(result).toMatchObject({ verify: true, perf: true, storybook: true, e2eSmoke: true, e2eStories: true });
      expect(result.balance).toBe(file === ".github/workflows/ci.yml" ? "full" : "fast");
    }
  });

  it("runs every job when the pull request has the label full-ci, and the full balance suite with full-balance", () => {
    expect(pr(["docs/design.md"], ["full-ci"])).toEqual({
      verify: true,
      perf: true,
      storybook: true,
      balance: "fast",
      e2eSmoke: true,
      e2eStories: true,
    });
    expect(pr(["src/ui/a.tsx"], ["full-balance"]).balance).toBe("full");
  });

  it("runs everything when the list of changed files is empty or unknown", () => {
    expect(pr([])).toMatchObject({ verify: true, perf: true, storybook: true, e2eSmoke: true, e2eStories: true, balance: "fast" });
  });

  it("takes the union of what each changed file needs", () => {
    const result = pr(["docs/design.md", "src/ui/a.tsx", "src/engine/b.ts"]);
    expect(result).toMatchObject({ verify: true, perf: true, storybook: true, balance: "full", e2eSmoke: true, e2eStories: true });
  });
});

describe("CI scope outside a pull request", () => {
  it("runs everything on a push to main, with the fast balance subset (the full suite runs nightly)", () => {
    expect(scope.ciScope({ event: "push", files: ["docs/x.md"], labels: [] })).toEqual({
      verify: true,
      perf: true,
      storybook: true,
      balance: "fast",
      e2eSmoke: true,
      e2eStories: true,
    });
  });
});

describe("CI scope output", () => {
  it("formats the scope as GitHub Actions outputs", () => {
    const lines = scope.formatOutputs({ verify: true, perf: false, storybook: false, balance: "none", e2eSmoke: true, e2eStories: false });
    expect(lines).toBe("verify=true\nperf=false\nstorybook=false\nbalance=none\ne2eSmoke=true\ne2eStories=false\n");
  });
});

describe("the CI workflow's use of the scope", () => {
  const ci = readFileSync(".github/workflows/ci.yml", "utf8");
  const jobBlock = (key: string) => new RegExp(`\\n {2}${key}:\\n[\\s\\S]*?(?=\\n {2}[a-z][a-z-]*:\\n|$)`).exec(ci)?.[0] ?? "";

  it("gates each scoped job on the scope and runs it anyway when the scope job did not succeed", () => {
    for (const key of ["verify", "e2e", "e2e-stories", "balance-fast"]) {
      const block = jobBlock(key);
      expect(block, key).toContain("needs: scope");
      expect(block, key).toContain("needs.scope.result != 'success'");
    }
  });

  it("never lets a cancelled run look like a skipped one", () => {
    for (const key of ["verify", "e2e", "e2e-stories", "balance-fast", "balance-shard"]) {
      expect(jobBlock(key), key).toContain("!cancelled()");
    }
  });

  it("passes the final Balance job when nothing that can affect balance changed, and not otherwise", () => {
    const block = jobBlock("balance");
    expect(block).toContain('if [ "$MODE" = "none" ]');
    expect(block).toContain("No balance job ran");
  });
});
