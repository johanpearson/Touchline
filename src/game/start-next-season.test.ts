import { describe, expect, it } from "vitest";
import { aCareer, deepFreeze } from "./career-builders";
import { playMatchdays, playSeasons } from "./season-test-helpers";
import { startNextSeason } from "./start-next-season";

const next = (career: ReturnType<typeof aCareer>) => {
  const result = startNextSeason(career);
  if (!result.ok) throw new Error(result.error);
  return result.career;
};

describe("startNextSeason", () => {
  it("returns a typed error for an unfinished season", () => {
    expect(startNextSeason(playMatchdays(aCareer(), 10))).toEqual({
      ok: false,
      error: "season-incomplete",
    });
  });

  it("starts season n+1 with a fresh fixture list, no results and the first matchday", () => {
    const old = playMatchdays(aCareer(), 26);

    const career = next(old);

    expect(career.season.number).toBe(2);
    expect(career.season.results).toEqual([]);
    expect(career.season.currentMatchday).toBe(1);
    expect(career.season.fixtures).toHaveLength(old.season.fixtures.length);
    expect(career.season.fixtures).not.toEqual(old.season.fixtures);
  });

  it("appends the finished season's summary to the history", () => {
    const career = next(playMatchdays(aCareer(), 26));

    expect(career.history).toHaveLength(1);
    expect(career.history[0]?.seasonNumber).toBe(1);
  });

  it("keeps clubs, players and the user's club unchanged", () => {
    const old = playMatchdays(aCareer(), 26);

    const career = next(old);

    expect(career.league).toEqual(old.league);
    expect(career.userClubId).toBe(old.userClubId);
    expect(career.seed).toBe(old.seed);
  });

  it("does not change its input and stays JSON round-trippable", () => {
    const old = deepFreeze(playMatchdays(aCareer(), 26));

    const career = next(old);

    expect(JSON.parse(JSON.stringify(career))).toEqual(career);
  });

  it("keeps three consecutive seasons in the history, each with every club at 26 played", () => {
    const career = playSeasons(aCareer(), 3);

    expect(career.season.number).toBe(3);
    const done = next(career);
    expect(done.history.map((h) => h.seasonNumber)).toEqual([1, 2, 3]);
    for (const summary of done.history) {
      expect(summary.finalTable.every((row) => row.played === 26)).toBe(true);
    }
  });

  it.each([2, 5, 9])("plays two full seasons consistently for seed %i", (seed) => {
    const career = next(playSeasons(aCareer(seed), 2));

    expect(career.history).toHaveLength(2);
    expect(career.history[1]?.seasonNumber).toBe(2);
    expect(career.history[0]?.finalTable).not.toEqual(career.history[1]?.finalTable);
  });
});
