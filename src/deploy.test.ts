import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string): string => readFileSync(path, "utf8");

describe("GitHub Pages deployment", () => {
  const workflow = read(".github/workflows/deploy.yml");

  it("deploys on every push to main", () => {
    expect(workflow).toMatch(/push:\s*\n\s*branches: \[main\]/);
  });

  it("builds the app and publishes the dist folder to Pages", () => {
    expect(workflow).toContain("npm run build");
    expect(workflow).toMatch(/upload-pages-artifact@\S+\s*\n\s*with:\s*\n\s*path: dist/);
    expect(workflow).toContain("actions/deploy-pages@");
  });

  it("links the live build from the README", () => {
    expect(read("README.md")).toContain("https://johanpearson.github.io/Touchline/");
  });
});
