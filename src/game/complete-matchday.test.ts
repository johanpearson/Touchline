import { describe, expect, it } from "vitest";
import type { Career } from "./career";
import { aCareer, deepFreeze } from "./career-builders";
import { completeMatchday } from "./complete-matchday";
import { computeTable, type Result } from "./compute-table";
import { getNextFixture } from "./get-next-fixture";
import { FITNESS_MAX, FITNESS_MIN, FORM_MAX, FORM_MIN } from "./player-condition";
import { playMatchdays } from "./season-test-helpers";
import { simulateFixture } from "./simulate-fixture";
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

// The user's result is simulated, as in a quick sim. Played once per career and shared (season-test-helpers.ts).
const playSeason = (start: Career): Career => playMatchdays(start, 26);

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

  it("rejects a user result played on another engine than the career's", () => {
    const career = aCareer();
    const v1Result = { ...userResultOf(career), engineVersion: 1 as const };

    expect(completeMatchday(career, v1Result)).toEqual({
      ok: false,
      error: "wrong-engine-version",
    });
  });

  it("simulates the other fixtures on the action engine", () => {
    const career = aCareer();

    const done = complete(career);

    expect(done.season.results.every((r) => r.engineVersion === 2)).toBe(true);
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

  it("plays a season of 26 matchdays to the end", () => {
    // The time budget for this season lives in complete-matchday.perf.test.ts (npm run test:perf).
    const career = playSeason(aCareer());

    expect(career.season.results).toHaveLength(182);
    expect(career.season.results.every((r) => r.engineVersion === 2)).toBe(true);
    expect(career.season.currentMatchday).toBe(27);
  }, 120_000);

  it("round-trips through JSON", () => {
    const career = complete(aCareer());

    expect(JSON.parse(JSON.stringify(career))).toEqual(career);
  });

  describe("minutes", () => {
    it("gives the starters 90 and an unused bench player 0", () => {
      const career = aCareer();

      const next = complete(career);

      expect(next.minutes[career.squadPlan.starters[0] as string]).toBe(90);
      expect(next.minutes[career.squadPlan.bench[0] as string] ?? 0).toBe(0);
    });

    it("gives the starters of AI clubs 90 minutes and counts every club", () => {
      const career = aCareer();

      const next = complete(career);

      const total = Object.values(next.minutes).reduce((sum, minutes) => sum + minutes, 0);
      expect(total).toBe(career.league.clubs.length * 11 * 90);
    });

    it("takes the minutes of the user's match from the report", () => {
      const career = aCareer();
      const [starter] = career.squadPlan.starters as [string];
      const [substitute] = career.squadPlan.bench as [string];
      const outcome = completeMatchday(career, userResultOf(career), {
        minutes: { [starter]: 60, [substitute]: 30 },
      });
      if (!outcome.ok) throw new Error(outcome.error);

      expect(outcome.career.minutes[starter]).toBe(60);
      expect(outcome.career.minutes[substitute]).toBe(30);
      expect(outcome.career.minutes[career.squadPlan.starters[1] as string] ?? 0).toBe(0);
    });

    it("adds up over matchdays and does not change the input", () => {
      const career = deepFreeze(aCareer());

      const twice = complete(complete(career));

      expect(twice.minutes[career.squadPlan.starters[0] as string]).toBe(180);
      expect(Object.values(career.minutes).every((minutes) => minutes === 0)).toBe(true);
    });
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
