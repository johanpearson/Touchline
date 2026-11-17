import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { THEME_STORAGE_KEY } from "../../platform";
import { DEFAULT_THEME, THEMES } from "./themes";

const html = readFileSync(resolve(process.cwd(), "index.html"), "utf8");

describe("index.html theme script", () => {
  it("reads the same storage key as the theme store", () => {
    expect(html).toContain(`getItem("${THEME_STORAGE_KEY}")`);
  });

  it("knows every theme and the default", () => {
    for (const theme of THEMES) expect(html).toContain(`"${theme}"`);
    expect(html).toContain(`var theme = "${DEFAULT_THEME}"`);
  });

  it("runs in the head, before the app script", () => {
    expect(html.indexOf("data-theme")).toBeGreaterThan(-1);
    expect(html.indexOf("data-theme")).toBeLessThan(html.indexOf("/src/main.tsx"));
  });
});
