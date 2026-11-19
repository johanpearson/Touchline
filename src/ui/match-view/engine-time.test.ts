import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const sources = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sources(path);
    const isSource = /\.tsx?$/.test(entry.name) && !/\.(test|stories)\.tsx?$/.test(entry.name);
    return isSource ? [path] : [];
  });

describe("match view time", () => {
  const files = sources(__dirname).filter(
    (path) => !/use-match-playback\.ts$|test-support\.ts$/.test(path),
  );

  it("is read from the director's clock: only the playback hook touches the engine's own time", () => {
    expect(files.length).toBeGreaterThan(20);
    const offenders = files.filter((path) =>
      /\.state\.time\b|\.advanceTo\(/.test(readFileSync(path, "utf8")),
    );
    expect(offenders).toEqual([]);
  });

  it("no longer knows the fixed speeds", () => {
    const offenders = files.filter((path) =>
      /\bSPEEDS\b|advanceClock/.test(readFileSync(path, "utf8")),
    );
    expect(offenders).toEqual([]);
  });
});
