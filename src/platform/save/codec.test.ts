import { describe, expect, it } from "vitest";
import { parseCareer } from "../../game";
import type { SaveEnvelope } from "../../shared";
import { createEnvelope, readEnvelope, updateEnvelope } from "./codec";
import careerV1 from "./fixtures/career-v1.json";
import careerV2 from "./fixtures/career-v2.json";
import type { Migration } from "./migrations";
import { CURRENT_SCHEMA_VERSION, MIGRATIONS } from "./schema";

const clock = () => "2031-02-03T04:05:06.000Z";

describe("createEnvelope", () => {
  it("stamps the current schema version and the clock time", () => {
    expect(createEnvelope({ n: 1 }, clock)).toEqual({
      schemaVersion: CURRENT_SCHEMA_VERSION,
      createdAt: "2031-02-03T04:05:06.000Z",
      savedAt: "2031-02-03T04:05:06.000Z",
      game: { n: 1 },
    });
  });
});

describe("updateEnvelope", () => {
  const previous: SaveEnvelope = {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    createdAt: "2020-01-01T00:00:00.000Z",
    savedAt: "2020-01-02T00:00:00.000Z",
    game: { n: 1 },
  };

  it("keeps createdAt, sets savedAt from the clock and replaces the game", () => {
    expect(updateEnvelope(previous, { n: 2 }, clock)).toEqual({
      ...previous,
      savedAt: "2031-02-03T04:05:06.000Z",
      game: { n: 2 },
    });
  });

  it("stamps the current schema version even when the previous save was older", () => {
    const older = { ...previous, schemaVersion: 0 };
    expect(updateEnvelope(older, { n: 2 }, clock).schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
  });

  it("does not mutate the previous envelope", () => {
    const copy = structuredClone(previous);
    updateEnvelope(previous, { n: 2 }, clock);
    expect(previous).toEqual(copy);
  });
});

describe("readEnvelope", () => {
  it("returns a current envelope", () => {
    const envelope = createEnvelope({ n: 1 }, clock);
    expect(readEnvelope(envelope)).toEqual({ ok: true, save: envelope });
  });

  it("rejects a save from a newer version", () => {
    const raw = { ...createEnvelope({}, clock), schemaVersion: CURRENT_SCHEMA_VERSION + 1 };
    expect(readEnvelope(raw)).toEqual({ ok: false, error: "newer-version" });
  });

  it.each([undefined, "", "yesterday", 42])(
    "rejects a current envelope with savedAt %j",
    (savedAt) => {
      const raw = { ...createEnvelope({}, clock), savedAt };
      expect(readEnvelope(raw)).toEqual({ ok: false, error: "invalid-envelope" });
    },
  );

  it.each([null, "save", 42, {}, { schemaVersion: 1 }])(
    "rejects an invalid envelope: %j",
    (raw) => {
      expect(readEnvelope(raw)).toEqual({ ok: false, error: "invalid-envelope" });
    },
  );
});

describe("MIGRATIONS", () => {
  const isGapless = (migrations: readonly Migration[], current: number): boolean => {
    const froms = migrations.map((m) => m.from).sort((a, b) => a - b);
    return froms.length === current - 1 && froms.every((from, index) => from === index + 1);
  };

  it("forms a gapless chain from version 1 to the current version", () => {
    expect(isGapless(MIGRATIONS, CURRENT_SCHEMA_VERSION)).toBe(true);
  });

  it("detects a missing step", () => {
    const step = (from: number): Migration => ({ from, migrate: (save) => save });
    expect(isGapless([step(1), step(3)], 4)).toBe(false);
    expect(isGapless([step(1)], 3)).toBe(false);
    expect(isGapless([step(1), step(2)], 3)).toBe(true);
  });
});

/*
 * FROZEN FIXTURE POLICY: `career-v1.json` is a real schema version 1 save (a career after four
 * matchdays). Never regenerate or edit it. When `Career` changes shape, bump
 * CURRENT_SCHEMA_VERSION, add a migration, add `career-v2.json` (a fresh save of the new shape)
 * and keep this v1 test: old saves in the wild must keep loading.
 */
describe("frozen schema v1 fixture", () => {
  it("migrates to the current version and its game parses as a career", () => {
    const result = readEnvelope(careerV1);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.save.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(parseCareer(result.save.game).ok).toBe(true);
  });

  it("sets savedAt to createdAt when migrating from v1", () => {
    const result = readEnvelope(careerV1);
    expect(result.ok && result.save.savedAt).toBe(careerV1.createdAt);
    expect(result.ok && result.save.createdAt).toBe(careerV1.createdAt);
  });

  it("matches the frozen v2 fixture apart from the version bump and savedAt", () => {
    const result = readEnvelope(careerV1);
    expect(result.ok && result.save.game).toEqual(careerV2.game);
  });
});

/** `career-v2.json` is a frozen schema version 2 save (adds `savedAt`). Never regenerate it. */
describe("frozen schema v2 fixture", () => {
  it("loads unchanged and its game parses as a career", () => {
    const result = readEnvelope(careerV2);
    expect(result).toEqual({ ok: true, save: careerV2 });
    if (!result.ok) return;
    expect(parseCareer(result.save.game).ok).toBe(true);
  });

  it("keeps createdAt and savedAt apart", () => {
    expect(careerV2.savedAt > careerV2.createdAt).toBe(true);
  });
});
