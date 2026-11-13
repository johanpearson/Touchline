import { describe, expect, it } from "vitest";
import type { Career } from "./career";
import { aCareer, deepFreeze } from "./career-builders";
import { completeMatchday } from "./complete-matchday";
import { computeTable, type Result } from "./compute-table";
import { getNextFixture } from "./get-next-fixture";
import { simulateFixture } from "./simulate-fixture";

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
});
