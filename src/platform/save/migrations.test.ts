import { describe, expect, it } from "vitest";
import type { SaveEnvelope } from "../../shared";
import { type Migration, migrateSave } from "./migrations";

const v1: SaveEnvelope = {
  schemaVersion: 1,
  createdAt: "2030-01-01T00:00:00.000Z",
  savedAt: "2030-01-01T00:00:00.000Z",
  game: { n: 1 },
};

const toV2: Migration = {
  from: 1,
  migrate: (save) => ({
    ...save,
    schemaVersion: 2,
    game: { ...(save.game as object), added: true },
  }),
};
const toV3: Migration = {
  from: 2,
  migrate: (save) => ({
    ...save,
    schemaVersion: 3,
    game: { ...(save.game as object), more: true },
  }),
};

describe("migrateSave", () => {
  it("returns a current save unchanged", () => {
    expect(migrateSave(v1, [], 1)).toEqual({ ok: true, save: v1 });
  });

  it("applies one migration", () => {
    const result = migrateSave(v1, [toV2], 2);
    expect(result).toEqual({
      ok: true,
      save: { ...v1, schemaVersion: 2, game: { n: 1, added: true } },
    });
  });

  it("applies migrations in order regardless of list order", () => {
    const result = migrateSave(v1, [toV3, toV2], 3);
    expect(result).toEqual({
      ok: true,
      save: { ...v1, schemaVersion: 3, game: { n: 1, added: true, more: true } },
    });
  });

  it("starts at the save's own version", () => {
    const v2 = { ...v1, schemaVersion: 2 };
    const result = migrateSave(v2, [toV2, toV3], 3);
    expect(result).toEqual({
      ok: true,
      save: { ...v2, schemaVersion: 3, game: { n: 1, more: true } },
    });
  });

  it("does not mutate the input", () => {
    const input = structuredClone(v1);
    migrateSave(input, [toV2], 2);
    expect(input).toEqual(v1);
  });

  it("fails for a save from a newer version", () => {
    expect(migrateSave({ ...v1, schemaVersion: 5 }, [], 2)).toEqual({
      ok: false,
      error: "newer-version",
    });
  });

  it("fails when a migration step is missing", () => {
    expect(migrateSave(v1, [toV3], 3)).toEqual({ ok: false, error: "missing-migration" });
  });

  it("fails when a migration does not advance the version", () => {
    const stuck: Migration = { from: 1, migrate: (save) => save };
    expect(migrateSave(v1, [stuck], 2)).toEqual({ ok: false, error: "missing-migration" });
  });

  it.each([
    ["null", null],
    ["a string", "save"],
    ["missing game", { schemaVersion: 1, createdAt: "x", savedAt: "x" }],
    ["missing createdAt", { schemaVersion: 1, game: {} }],
    ["non-integer version", { schemaVersion: 1.5, createdAt: "x", game: {} }],
    ["version below 1", { schemaVersion: 0, createdAt: "x", game: {} }],
    ["string version", { schemaVersion: "1", createdAt: "x", game: {} }],
  ])("fails for an invalid envelope: %s", (_name, raw) => {
    expect(migrateSave(raw, [], 1)).toEqual({ ok: false, error: "invalid-envelope" });
  });
});
