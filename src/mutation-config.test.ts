import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string): string => readFileSync(path, "utf8");
const readJson = (path: string): Record<string, unknown> => JSON.parse(read(path));

describe("mutation testing setup", () => {
  const config = readJson("stryker.config.json");

  it("uses the Vitest runner", () => {
    expect(config.testRunner).toBe("vitest");
  });

  it("only mutates non-test files in src/engine", () => {
    expect(config.mutate).toEqual([
      "src/engine/**/*.ts",
      "!src/engine/**/*.test.ts",
      "!src/engine/index.ts",
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

  it("is run by the nightly workflow and uploads the report", () => {
    const nightly = read(".github/workflows/nightly.yml");
    expect(nightly).toContain("npm run test:mutation");
    expect(nightly).toContain("path: reports/mutation");
  });

  it("keeps generated reports out of git", () => {
    expect(read(".gitignore")).toMatch(/^reports$/m);
  });
});
