import { describe, expect, it } from "vitest";
import type { SaveEnvelope } from "../../shared";
import { readEnvelope } from "./codec";
import careerV1 from "./fixtures/career-v1.json";
import { MAX_SAVE_FILE_BYTES, parseSaveFile, saveFileName, serializeSave } from "./save-file";
import { CURRENT_SCHEMA_VERSION } from "./schema";

const envelope: SaveEnvelope = {
  schemaVersion: CURRENT_SCHEMA_VERSION,
  createdAt: "2030-01-01T00:00:00.000Z",
  savedAt: "2030-01-02T00:00:00.000Z",
  game: { n: 1 },
};

describe("serializeSave", () => {
  it("writes pretty-printed JSON with two spaces", () => {
    expect(serializeSave(envelope)).toBe(JSON.stringify(envelope, null, 2));
  });
});

describe("parseSaveFile", () => {
  it("round-trips an envelope", () => {
    expect(parseSaveFile(serializeSave(envelope))).toEqual({ ok: true, save: envelope });
  });

  it("imports the frozen v1 fixture as a current-version envelope", () => {
    const result = parseSaveFile(JSON.stringify(careerV1));
    expect(result).toEqual(readEnvelope(careerV1));
    expect(result.ok && result.save.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
  });

  it("rejects text that is not JSON", () => {
    expect(parseSaveFile("{ nope")).toEqual({ ok: false, error: "not-json" });
  });

  it("rejects JSON that is not an envelope", () => {
    expect(parseSaveFile('{"hello":1}')).toEqual({ ok: false, error: "invalid-envelope" });
  });

  it("rejects a save from a newer version", () => {
    const text = JSON.stringify({ ...envelope, schemaVersion: CURRENT_SCHEMA_VERSION + 1 });
    expect(parseSaveFile(text)).toEqual({ ok: false, error: "newer-version" });
  });

  it("rejects files above the size limit", () => {
    expect(parseSaveFile(" ".repeat(MAX_SAVE_FILE_BYTES + 1))).toEqual({
      ok: false,
      error: "file-too-large",
    });
  });

  it("measures the limit in bytes, not characters", () => {
    const text = "å".repeat(MAX_SAVE_FILE_BYTES / 2 + 1);
    expect(parseSaveFile(text)).toEqual({ ok: false, error: "file-too-large" });
  });
});

describe("saveFileName", () => {
  const name = (clubName: string) => saveFileName({ clubName, season: 2, matchday: 14 });

  it("builds touchline-<club>-s<season>-md<matchday>.json", () => {
    expect(name("Skogsnäs Park")).toBe("touchline-skogsnas-park-s2-md14.json");
  });

  it.each([
    ["Västerås", "vasteras"],
    ["Åkerby", "akerby"],
    ["Öster IF", "oster-if"],
  ])("slugifies %s to %s", (club, slug) => {
    expect(name(club)).toBe(`touchline-${slug}-s2-md14.json`);
  });

  it("falls back to a fixed slug for empty or symbol-only names", () => {
    expect(name("")).toBe("touchline-club-s2-md14.json");
    expect(name("  !!! ")).toBe("touchline-club-s2-md14.json");
  });

  it("never produces path separators or dot-dot", () => {
    const result = name("../../etc/passwd");
    expect(result).not.toMatch(/[/\\]/);
    expect(result).not.toContain("..");
    expect(name("a/b\\c")).toBe("touchline-a-b-c-s2-md14.json");
  });

  it("limits very long names", () => {
    expect(name("x".repeat(500)).length).toBeLessThanOrEqual(80);
  });
});
