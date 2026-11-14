import { describe, expect, it } from "vitest";
import { autoPickLineup } from "./auto-pick-lineup";
import type { Career } from "./career";
import { aCareer, deepFreeze } from "./career-builders";
import { completeMatchday } from "./complete-matchday";
import { computeTable, type Result } from "./compute-table";
import { getNextFixture } from "./get-next-fixture";
import { FITNESS_MAX, FITNESS_MIN, FORM_MAX, FORM_MIN } from "./player-condition";
import { simulateFixture } from "./simulate-fixture";
import { clubSquad } from "./squad-plan";
import { startNextSeason } from "./start-next-season";

const userResultOf = (career: Career): Result => {
  const fixture = getNextFixture(career.season, career.userClubId);
  if (!fixture) throw new Error("season over");
  return simulateFixture(career, fixture);
};

const complete = (career: Career, userResult = userResultOf(career)): Career => {
  const outcome = completeMatchday(career, userResult);
  if (!outcome.ok) throw new Error(outcome.error);
  return outcome.career;
};

const playSeason = (start: Career): Career => {
  let career = start;
  for (let i = 0; i < 26; i++) career = complete(career);
  return career;
};

describe("completeMatchday", () => {
  it("appends the whole round and moves to the next matchday", () => {
    const career = aCareer();

    const next = complete(career);

    expect(next.season.currentMatchday).toBe(2);
    expect(next.season.results).toHaveLength(7);
    const roundIds = career.season.fixtures.filter((f) => f.matchday === 1).map((f) => f.id);
    expect(next.season.results.map((r) => r.fixtureId)).toEqual(roundIds);
  });

  it("uses the given user result as is", () => {
    const career = aCareer();
    const result = { ...userResultOf(career), homeGoals: 9, awayGoals: 8 };

    const next = complete(career, result);

    expect(next.season.results).toContainEqual(result);
  });

  it("does not change the other matches whatever the user's score was", () => {
    const career = aCareer();
    const fixture = getNextFixture(career.season, career.userClubId) as NonNullable<
      ReturnType<typeof getNextFixture>
    >;
    const userResult = userResultOf(career);
    const others = (c: Career) => c.season.results.filter((r) => r.fixtureId !== fixture.id);

    const viewed = complete(career, userResult);
    const quickSimmed = complete(career, { ...userResult });

    expect(others(viewed)).toEqual(others(quickSimmed));
    expect(others(complete(career, { ...userResult, homeGoals: 7 }))).toEqual(others(viewed));
  });

  it("does not mutate the input career", () => {
    const career = deepFreeze(aCareer());

    expect(() => complete(career)).not.toThrow();
  });

  it("rejects a result for a fixture of another matchday", () => {
    const career = aCareer();
    const later = career.season.fixtures.find((f) => f.matchday === 2) as never as Result & {
      id: string;
    };
    const result = { ...userResultOf(career), fixtureId: later.id };

    expect(completeMatchday(career, result)).toEqual({ ok: false, error: "wrong-matchday" });
  });

  it("rejects a result for an unknown fixture", () => {
    const career = aCareer();
    const result = { ...userResultOf(career), fixtureId: "nope" };

    expect(completeMatchday(career, result)).toEqual({ ok: false, error: "wrong-fixture" });
  });

  it("rejects a result whose clubs do not match the fixture", () => {
    const career = aCareer();
    const result = userResultOf(career);

    expect(
      completeMatchday(career, { ...result, homeClubId: result.awayClubId, awayClubId: "x" }),
    ).toEqual({ ok: false, error: "wrong-fixture" });
  });

  it("rejects completing the same matchday twice", () => {
    const career = aCareer();
    const result = userResultOf(career);
    const next = complete(career, result);

    expect(completeMatchday(next, result)).toEqual({
      ok: false,
      error: "matchday-already-completed",
    });
  });

  it("rejects completing a matchday after the season is over", () => {
    const finished = playSeason(aCareer());

    expect(completeMatchday(finished, userResultOf(aCareer()))).toEqual({
      ok: false,
      error: "season-complete",
    });
  });

  it("leaves 182 results and 26 played per club after 26 matchdays", () => {
    const finished = playSeason(aCareer());
    const ids = finished.league.clubs.map((c) => c.id);

    const table = computeTable(ids, finished.season.results);

    expect(finished.season.results).toHaveLength(182);
    expect(table.ok && table.table.every((row) => row.played === 26)).toBe(true);
  });

  it("round-trips through JSON", () => {
    const career = complete(aCareer());

    expect(JSON.parse(JSON.stringify(career))).toEqual(career);
  });

  it.each([1, 42, 2024])("completes a season with a consistent table for seed %i", (seed) => {
    const finished = playSeason(aCareer(seed));
    const ids = finished.league.clubs.map((c) => c.id);

    const table = computeTable(ids, finished.season.results);

    expect(table.ok).toBe(true);
    const rows = table.ok ? table.table : [];
    expect(rows.reduce((n, r) => n + r.goalsFor, 0)).toBe(
      rows.reduce((n, r) => n + r.goalsAgainst, 0),
    );
    expect(rows.every((r) => r.played === 26)).toBe(true);
  });

  describe("condition", () => {
    it("drains the user's starters (90 minutes without a report) and keeps the bench fresh", () => {
      const career = aCareer();

      const next = complete(career);

      const starter = career.squadPlan.starters[0] as string;
      const bench = career.squadPlan.bench[0] as string;
      expect(next.condition[starter]?.fitness).toBe(92.5);
      expect(next.condition[bench]?.fitness).toBe(100);
    });

    it("uses the report's minutes for the user's club", () => {
      const career = aCareer();
      const [half, full] = career.squadPlan.starters as [string, string];
      const outcome = completeMatchday(career, userResultOf(career), {
        minutes: { [half]: 45, [full]: 90 },
      });
      if (!outcome.ok) throw new Error(outcome.error);

      expect(outcome.career.condition[half]?.fitness).toBe(96.25);
      expect(outcome.career.condition[full]?.fitness).toBe(92.5);
      expect(outcome.career.condition[career.squadPlan.starters[2] as string]?.fitness).toBe(100);
    });

    it("rotates at least one AI club's eleven because of fatigue, always with a valid lineup", () => {
      for (const seed of [1, 2, 3]) {
        let career = aCareer(seed);
        const elevenOf = (c: Career, clubId: string) => {
          const club = c.league.clubs.find((x) => x.id === clubId);
          if (!club) throw new Error("club");
          const squad = clubSquad(club, c.league.players);
          return [...autoPickLineup(squad, "4-4-2", c.condition).starters].sort().join();
        };
        const aiIds = career.league.clubs.map((c) => c.id).filter((id) => id !== career.userClubId);
        const first = new Map(aiIds.map((id) => [id, elevenOf(career, id)]));
        let rotated = false;
        for (let day = 0; day < 26; day++) {
          career = complete(career);
          for (const id of aiIds) {
            if (elevenOf(career, id) !== first.get(id)) rotated = true;
          }
        }
        expect(rotated).toBe(true);
      }
    });

    it("keeps every condition within bounds over a season", () => {
      const finished = playSeason(aCareer());

      for (const { fitness, form } of Object.values(finished.condition)) {
        expect(fitness).toBeGreaterThanOrEqual(FITNESS_MIN);
        expect(fitness).toBeLessThanOrEqual(FITNESS_MAX);
        expect(form).toBeGreaterThanOrEqual(FORM_MIN);
        expect(form).toBeLessThanOrEqual(FORM_MAX);
      }
    });

    it("resets condition in the next season and keeps the squad plan", () => {
      const finished = playSeason(aCareer());
      const next = startNextSeason(finished);
      if (!next.ok) throw new Error(next.error);

      expect(Object.values(finished.condition).some((c) => c.fitness < 100)).toBe(true);
      expect(
        Object.values(next.career.condition).every((c) => c.fitness === 100 && c.form === 5),
      ).toBe(true);
      expect(next.career.squadPlan).toEqual(finished.squadPlan);
    });
  });
});
