import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { describe, expect, it } from "vitest";

/** Biome's stdin mode does not report diagnostics reliably, so lint a real file in a scratch dir. */
function lint(path: string, code: string) {
  const dir = mkdtempSync(join(dirname(path), "lint-fixture-"));
  const file = join(dir, basename(path));
  try {
    writeFileSync(file, code);
    return spawnSync("npx", ["biome", "lint", file], { encoding: "utf8" });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

const forbidden = [
  "Math.random()",
  "Date.now()",
  "new Date()",
  "window.innerWidth",
  "document.title",
];

describe("engine and game purity lint rules", () => {
  describe.each(["src/engine/x.ts", "src/game/x.ts"])("in %s", (path) => {
    it.each(forbidden)("fails on %s", (expr) => {
      expect(lint(path, `export const v = ${expr};\n`).status).not.toBe(0);
    });

    it("accepts pure code", () => {
      expect(lint(path, "export const v = 1 + 1;\n").status).toBe(0);
    });
  });

  it("allows the same APIs outside engine and game", () => {
    expect(lint("src/ui/x.ts", "export const v = Date.now() + window.innerWidth;\n").status).toBe(
      0,
    );
  });
});
