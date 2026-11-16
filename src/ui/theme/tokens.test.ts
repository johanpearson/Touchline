import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { contrastRatio, parseHexColour, type Rgb } from "./contrast";
import { parseThemeTokens } from "./parse-tokens";
import { THEMES } from "./themes";

const read = (file: string) => readFileSync(new URL(file, import.meta.url), "utf8");
const themes = parseThemeTokens(read("./tokens.css"));

const REQUIRED_TOKENS = [
  "bg",
  "side",
  "surface",
  "raised",
  "sunk",
  "track",
  "text",
  "soft",
  "muted",
  "line",
  "glow",
  "stage",
  "stage-glow",
  "good",
  "bad",
  "info",
  "warn",
  "accent",
  "on-accent",
  "focus",
];

const colour = (theme: string, token: string): Rgb => {
  const parsed = parseHexColour(themes[theme]?.[token] ?? "");
  if (!parsed) throw new Error(`${theme}: --${token} is not an opaque hex colour`);
  return parsed;
};

const SURFACES = ["bg", "surface", "raised"];

describe("tokens.css", () => {
  it("defines exactly the three themes", () => {
    expect(Object.keys(themes).sort()).toEqual([...THEMES].sort());
  });

  it.each(THEMES)("%s defines every token", (theme) => {
    const missing = REQUIRED_TOKENS.filter((token) => !(token in (themes[theme] ?? {})));
    expect(missing).toEqual([]);
  });

  it.each(THEMES)("%s defines nothing the other themes lack", (theme) => {
    const extra = Object.keys(themes[theme] ?? {}).filter(
      (token) => !REQUIRED_TOKENS.includes(token),
    );
    expect(extra).toEqual([]);
  });

  it("defines the radii from 10 px to 26 px and the pill", () => {
    const css = read("./tokens.css");
    for (const [name, value] of [
      ["sm", "10px"],
      ["md", "14px"],
      ["lg", "18px"],
      ["xl", "26px"],
      ["pill", "999px"],
    ]) {
      expect(css).toContain(`--r-${name}: ${value};`);
    }
  });
});

describe.each(THEMES)("contrast in %s", (theme) => {
  it.each(["text", "soft", "muted", "good", "bad", "info", "warn"])(
    "%s reaches 4.5:1 on bg, surface and raised",
    (token) => {
      for (const surface of SURFACES) {
        expect(contrastRatio(colour(theme, token), colour(theme, surface))).toBeGreaterThanOrEqual(
          4.5,
        );
      }
    },
  );

  it("on-accent reaches 4.5:1 on accent", () => {
    expect(
      contrastRatio(colour(theme, "on-accent"), colour(theme, "accent")),
    ).toBeGreaterThanOrEqual(4.5);
  });

  it("the focus ring reaches 3:1 on bg, surface and raised", () => {
    for (const surface of SURFACES) {
      expect(contrastRatio(colour(theme, "focus"), colour(theme, surface))).toBeGreaterThanOrEqual(
        3,
      );
    }
  });
});

describe("theme.css", () => {
  const css = read("./theme.css");

  it("turns off transitions and animations under prefers-reduced-motion", () => {
    const block =
      /@media \(prefers-reduced-motion: reduce\)\s*\{([\s\S]*?)\n\}/.exec(css)?.[1] ?? "";
    expect(block).toMatch(/animation-duration:\s*0\.01ms\s*!important/);
    expect(block).toMatch(/transition-duration:\s*0\.01ms\s*!important/);
  });

  it("gives stat numbers tabular figures", () => {
    expect(css).toMatch(/@utility tabular\s*\{[^}]*tabular-nums/);
  });

  it("bundles Barlow Condensed 500 to 800 and Barlow 400 to 600 from fontsource", () => {
    for (const weight of [500, 600, 700, 800]) {
      expect(css).toContain(`@fontsource/barlow-condensed/${weight}.css`);
    }
    for (const weight of [400, 500, 600]) {
      expect(css).toContain(`@fontsource/barlow/${weight}.css`);
    }
  });

  it("loads no font from a CDN", () => {
    expect(css).not.toMatch(/https?:\/\//);
  });
});
