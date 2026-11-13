import { describe, expect, it } from "vitest";
import { createRng } from "../engine";
import { type Fixture, generateFixtures } from "./generate-fixtures";

const idsOf = (n: number): string[] => Array.from({ length: n }, (_, i) => `c${i + 1}`);

const fixturesOf = (n: number, seed: number): Fixture[] => {
  const result = generateFixtures(idsOf(n), createRng(seed));
  if (!result.ok) throw new Error(`Expected fixtures, got ${result.error}`);
  return result.fixtures;
};

const firstHalf = (fixtures: Fixture[], n: number): Fixture[] =>
  fixtures.filter((f) => f.matchday <= n - 1);

const homeAwayRuns = (fixtures: Fixture[], clubId: string, n: number): boolean[] =>
  firstHalf(fixtures, n)
    .filter((f) => f.homeClubId === clubId || f.awayClubId === clubId)
    .sort((a, b) => a.matchday - b.matchday)
    .map((f) => f.homeClubId === clubId);

const longestRun = (flags: boolean[]): number => {
  let best = 0;
  let run = 0;
  flags.forEach((flag, i) => {
    run = i > 0 && flag === flags[i - 1] ? run + 1 : 1;
    best = Math.max(best, run);
  });
  return best;
};

describe("generateFixtures", () => {
  it("gives a hand-written schedule for 4 clubs when the seed leaves the slot order unchanged", () => {
    const keepOrder = { ...createRng(1), int: (_min: number, max: number) => max };
    const result = generateFixtures(["a", "b", "c", "d"], keepOrder);
    if (!result.ok) throw new Error("Expected fixtures");
    expect(result.fixtures.map((f) => `${f.matchday}:${f.homeClubId}-${f.awayClubId}`)).toEqual([
      "1:a-d",
      "1:c-b",
      "2:b-a",
      "2:d-c",
      "3:a-c",
      "3:b-d",
      "4:d-a",
      "4:b-c",
      "5:a-b",
      "5:c-d",
      "6:c-a",
      "6:d-b",
    ]);
  });

  it.each([4, 12, 14, 16])("gives %i clubs 2(n-1) matchdays and n(n-1) fixtures", (n) => {
    const fixtures = fixturesOf(n, 3);
    expect(fixtures).toHaveLength(n * (n - 1));
    expect(Math.max(...fixtures.map((f) => f.matchday))).toBe(2 * (n - 1));
  });

  it.each([4, 12, 14, 16])("lets every club play once per matchday with %i clubs", (n) => {
    for (let seed = 1; seed <= 20; seed++) {
      const fixtures = fixturesOf(n, seed);
      for (let md = 1; md <= 2 * (n - 1); md++) {
        const clubs = fixtures
          .filter((f) => f.matchday === md)
          .flatMap((f) => [f.homeClubId, f.awayClubId]);
        expect(new Set(clubs).size).toBe(n);
        expect(clubs).toHaveLength(n);
      }
    }
  });

  it.each([4, 12, 14, 16])(
    "uses each ordered pair once and mirrors the second half with %i clubs",
    (n) => {
      for (let seed = 1; seed <= 20; seed++) {
        const fixtures = fixturesOf(n, seed);
        const pairs = fixtures.map((f) => `${f.homeClubId}>${f.awayClubId}`);
        expect(new Set(pairs).size).toBe(n * (n - 1));
        for (const f of firstHalf(fixtures, n)) {
          const mirror = fixtures.find((m) => m.matchday === f.matchday + n - 1);
          expect(mirror).toBeDefined();
          const same = fixtures.filter(
            (m) =>
              m.matchday === f.matchday + n - 1 &&
              m.homeClubId === f.awayClubId &&
              m.awayClubId === f.homeClubId,
          );
          expect(same).toHaveLength(1);
        }
      }
    },
  );

  it.each([4, 12, 14, 16])("balances home and away in the first half with %i clubs", (n) => {
    for (let seed = 1; seed <= 20; seed++) {
      const fixtures = fixturesOf(n, seed);
      for (const clubId of idsOf(n)) {
        const flags = homeAwayRuns(fixtures, clubId, n);
        expect(longestRun(flags)).toBeLessThanOrEqual(2);
        const home = flags.filter(Boolean).length;
        expect(Math.abs(home - n / 2)).toBeLessThanOrEqual(1);
        expect(Math.abs(flags.length - home - n / 2)).toBeLessThanOrEqual(1);
      }
    }
  });

  it("is deterministic for the same seed", () => {
    expect(fixturesOf(14, 5)).toEqual(fixturesOf(14, 5));
  });

  it("gives different schedules for different seeds", () => {
    expect(fixturesOf(14, 5)).not.toEqual(fixturesOf(14, 6));
  });

  it("gives unique ids and keeps results out of the fixtures", () => {
    const fixtures = fixturesOf(14, 2);
    expect(new Set(fixtures.map((f) => f.id)).size).toBe(fixtures.length);
    expect(Object.keys(fixtures[0] as Fixture).sort()).toEqual([
      "awayClubId",
      "homeClubId",
      "id",
      "matchday",
    ]);
  });

  it.each([0, 1, 3, 13])("rejects %i clubs", (n) => {
    expect(generateFixtures(idsOf(n), createRng(1))).toEqual({
      ok: false,
      error: "invalid-club-count",
    });
  });

  it("rejects duplicate club ids", () => {
    expect(generateFixtures(["a", "a", "b", "c"], createRng(1))).toEqual({
      ok: false,
      error: "duplicate-club-ids",
    });
  });
});
