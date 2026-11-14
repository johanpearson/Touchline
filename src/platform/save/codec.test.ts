import { describe, expect, it } from "vitest";
import { createMatch, NEUTRAL_TACTICS } from "../../engine";
import {
  type Career,
  deriveTeamProfile,
  type Fixture,
  getNextFixture,
  matchSeed,
  parseCareer,
  simulateFixture,
} from "../../game";
import type { SaveEnvelope } from "../../shared";
import { createEnvelope, readEnvelope, updateEnvelope } from "./codec";
import careerV1 from "./fixtures/career-v1.json";
import careerV2 from "./fixtures/career-v2.json";
import careerV3 from "./fixtures/career-v3.json";
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

  it("migrates to the same game as the frozen v2 fixture", () => {
    const fromV1 = readEnvelope(careerV1);
    const fromV2 = readEnvelope(careerV2);
    expect(fromV1.ok && fromV2.ok && fromV1.save.game).toEqual(fromV2.ok && fromV2.save.game);
  });
});

/** The M4 way to play a fixture: best-eleven 4-4-2 profiles and no tactics. */
const legacyResult = (v2: Career, fixture: Fixture) => {
  const club = (id: string) =>
    v2.league.clubs.find((c) => c.id === id) as Career["league"]["clubs"][number];
  const match = createMatch(
    {
      home: deriveTeamProfile(club(fixture.homeClubId), v2.league.players),
      away: deriveTeamProfile(club(fixture.awayClubId), v2.league.players),
      homeTactics: NEUTRAL_TACTICS,
      awayTactics: NEUTRAL_TACTICS,
    },
    matchSeed(v2, fixture),
  );
  match.advanceTo(1_000_000);
  match.resume();
  match.advanceTo(1_000_000);
  const { home, away } = match.state.score;
  return {
    fixtureId: fixture.id,
    homeClubId: fixture.homeClubId,
    awayClubId: fixture.awayClubId,
    homeGoals: home,
    awayGoals: away,
  };
};

/** `career-v2.json` is a frozen schema version 2 save (adds `savedAt`). Never regenerate it. */
describe("frozen schema v2 fixture", () => {
  it("migrates to a valid v3 career with the 4-4-2 best eleven, neutral tactics and full condition", () => {
    const result = readEnvelope(careerV2);
    expect(result.ok && result.save.schemaVersion).toBe(3);
    if (!result.ok) return;
    const parsed = parseCareer(result.save.game);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.career.squadPlan.formation).toBe("4-4-2");
    expect(parsed.career.squadPlan.tactics).toEqual(NEUTRAL_TACTICS);
    expect(
      Object.values(parsed.career.condition).every((c) => c.fitness === 100 && c.form === 5),
    ).toBe(true);
  });

  it("plays its next matchday to the same result as before the plan existed", () => {
    const result = readEnvelope(careerV2);
    if (!result.ok) throw new Error(result.error);
    const parsed = parseCareer(result.save.game);
    if (!parsed.ok) throw new Error(parsed.error);
    const career = parsed.career;
    const old = careerV2.game as unknown as Parameters<typeof legacyResult>[0];
    const fixture = getNextFixture(career.season, career.userClubId);
    if (!fixture) throw new Error("no fixture");

    expect(simulateFixture(career, fixture)).toEqual(legacyResult(old, fixture));
  });

  it("keeps createdAt and savedAt apart", () => {
    expect(careerV2.savedAt > careerV2.createdAt).toBe(true);
  });
});

/** `career-v3.json` is a frozen schema version 3 save (adds squad plan and condition). Never regenerate it. */
describe("frozen schema v3 fixture", () => {
  it("loads unchanged and its game parses as a career with its plan", () => {
    const result = readEnvelope(careerV3);
    expect(result).toEqual({ ok: true, save: careerV3 });
    if (!result.ok) return;
    const parsed = parseCareer(result.save.game);
    expect(parsed.ok && parsed.career.squadPlan.formation).toBe("4-3-3");
    expect(parsed.ok && parsed.career.squadPlan.tactics.mentality).toBe("attacking");
  });
});
