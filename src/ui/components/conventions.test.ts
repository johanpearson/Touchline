import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const dir = resolve(process.cwd(), "src/ui/components");
const files = readdirSync(dir);
const isTest = (f: string) => /\.test\.tsx?$/.test(f);
const isStory = (f: string) => f.endsWith(".stories.tsx");

describe("component conventions", () => {
  it("has a story next to every component file", () => {
    const components = files.filter((f) => f.endsWith(".tsx") && !isTest(f) && !isStory(f));
    const missing = components.filter((f) => !files.includes(f.replace(/\.tsx$/, ".stories.tsx")));
    expect(missing).toEqual([]);
  });

  it("uses tokens only: no raw colours in components or stories", () => {
    const raw = /#[0-9a-fA-F]{3,8}\b|\b(?:rgb|rgba|hsl|hsla)\(/;
    const offenders = files
      .filter((f) => /\.(tsx?|css)$/.test(f) && !isTest(f))
      .filter((f) => raw.test(readFileSync(join(dir, f), "utf8")));
    expect(offenders).toEqual([]);
  });
});
