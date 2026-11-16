import { describe, expect, it } from "vitest";
import { parseThemeTokens } from "./parse-tokens";

const css = `
/* a comment with :root[data-theme="ghost"] { --x: 1; } */
:root { --radius-md: 14px; }
:root[data-theme="midnight"] {
  --bg: #0A0E17;
  --line: rgba(200, 215, 255, 0.12);
}
:root[data-theme="light"] { --bg: #F3F5F9; }
`;

describe("parseThemeTokens", () => {
  it("collects the custom properties of every theme block", () => {
    expect(parseThemeTokens(css)).toEqual({
      midnight: { bg: "#0A0E17", line: "rgba(200, 215, 255, 0.12)" },
      light: { bg: "#F3F5F9" },
    });
  });

  it("ignores comments and blocks that are not a theme", () => {
    expect(Object.keys(parseThemeTokens(css))).toEqual(["midnight", "light"]);
  });
});
