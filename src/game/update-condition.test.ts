import { describe, expect, it } from "vitest";
import { aCareer, deepFreeze } from "./career-builders";
import type { Result } from "./compute-table";
import { ENERGY_SPENT_PER_MATCH } from "./player-condition";
import { updateConditionAfterMatchday, userReportWithEnergy } from "./update-condition";

const careerAndResults = () => {
  const career = aCareer();
  const round = career.season.fixtures.filter((f) => f.matchday === 1);
  return { career, round };
};

const resultFor = (
  fixture: { id: string; homeClubId: string; awayClubId: string },
  homeGoals: number,
  awayGoals: number,
): Result => ({
  fixtureId: fixture.id,
  homeClubId: fixture.homeClubId,
  awayClubId: fixture.awayClubId,
  homeGoals,
  awayGoals,
  engineVersion: 1,
});

const clubPlayers = (career: ReturnType<typeof aCareer>, clubId: string) =>
  career.league.clubs.find((c) => c.id === clubId)?.playerIds ?? [];

describe("updateConditionAfterMatchday", () => {
  it("drains a 90-minute starter by 10, recovers a quarter of the gap and moves form by the result", () => {
    const { career, round } = careerAndResults();
    const userFixture = round.find(
      (f) => f.homeClubId === career.userClubId || f.awayClubId === career.userClubId,
    );
    if (!userFixture) throw new Error("no user fixture");
    const userIsHome = userFixture.homeClubId === career.userClubId;
    const results = round.map((f) =>
      f.id === userFixture.id
        ? resultFor(f, userIsHome ? 2 : 0, userIsHome ? 0 : 2)
        : resultFor(f, 1, 1),
    );

    const condition = updateConditionAfterMatchday(career, results);

    const starter = career.squadPlan.starters[0] as string;
    expect(condition[starter]).toEqual({ fitness: 92.5, form: 6 });
  });

  it("leaves players who did not play at full fitness and unchanged form", () => {
    const { career, round } = careerAndResults();
    const results = round.map((f) => resultFor(f, 3, 0));
    const unused = clubPlayers(career, career.userClubId).find(
      (id) => !career.squadPlan.starters.includes(id) && !career.squadPlan.bench.includes(id),
    ) as string;

    const condition = updateConditionAfterMatchday(career, results);

    expect(condition[unused]).toEqual({ fitness: 100, form: 5 });
  });

  it("lowers form for the losing side and keeps it for a draw", () => {
    const { career, round } = careerAndResults();
    const [first, second] = round;
    if (!first || !second) throw new Error("need two fixtures");
    const results = round.map((f) => (f.id === first.id ? resultFor(f, 0, 2) : resultFor(f, 1, 1)));

    const condition = updateConditionAfterMatchday(career, results);

    const loser = clubPlayers(career, first.homeClubId);
    const drawn = clubPlayers(career, second.homeClubId);
    const formOf = (ids: readonly string[]) => ids.map((id) => condition[id]?.form);
    expect(formOf(loser)).toContain(4);
    expect(formOf(drawn).every((form) => form === 5)).toBe(true);
  });

  it("uses the report's minutes for the user's club", () => {
    const { career, round } = careerAndResults();
    const results = round.map((f) => resultFor(f, 1, 1));
    const [half, full] = career.squadPlan.starters as [string, string];
    const [benchPlayer] = career.squadPlan.bench as [string];

    const condition = updateConditionAfterMatchday(career, results, {
      minutes: { [half]: 45, [full]: 90 },
    });

    expect(condition[half]?.fitness).toBeCloseTo(100 - 5 + 5 * 0.25, 10);
    expect(condition[full]?.fitness).toBe(92.5);
    expect(condition[benchPlayer]?.fitness).toBe(100);
    const missing = career.squadPlan.starters[2] as string;
    expect(condition[missing]?.fitness).toBe(100);
  });

  it("adds the report's fatigue to the user's players only", () => {
    const { career, round } = careerAndResults();
    const results = round.map((f) => resultFor(f, 1, 1));
    const [first] = career.squadPlan.starters as [string];

    const condition = updateConditionAfterMatchday(career, results, {
      minutes: { [first]: 90 },
      fatigue: { [first]: 2 },
    });

    expect(condition[first]?.fitness).toBe(100 - 12 + 12 * 0.25);
  });

  it("drains by the energy spent when the report records it, not by the minutes", () => {
    const { career, round } = careerAndResults();
    const results = round.map((f) => resultFor(f, 1, 1));
    const [first] = career.squadPlan.starters as [string];
    const spent = ENERGY_SPENT_PER_MATCH * 2;

    const condition = updateConditionAfterMatchday(career, results, {
      minutes: { [first]: 90 },
      energy: { [first]: 100 - spent },
    });

    expect(condition[first]?.fitness).toBe(100 - 20 + 20 * 0.25);
  });

  it("counts a shout once: with energy only the mentality part of the fatigue is added", () => {
    const { career, round } = careerAndResults();
    const results = round.map((f) => resultFor(f, 1, 1));
    const [first] = career.squadPlan.starters as [string];

    const condition = updateConditionAfterMatchday(career, results, {
      minutes: { [first]: 90 },
      energy: { [first]: 100 - ENERGY_SPENT_PER_MATCH },
      fatigue: { [first]: 3 },
      mentalityFatigue: { [first]: 1 },
    });

    expect(condition[first]?.fitness).toBe(100 - 11 + 11 * 0.25);
  });

  it("keeps the minutes-based drain for a player without a recorded energy", () => {
    const { career, round } = careerAndResults();
    const results = round.map((f) => resultFor(f, 1, 1));
    const [first, second] = career.squadPlan.starters as [string, string];

    const condition = updateConditionAfterMatchday(career, results, {
      minutes: { [first]: 90, [second]: 90 },
      energy: { [first]: 100 - ENERGY_SPENT_PER_MATCH },
      fatigue: { [second]: 2 },
    });

    expect(condition[second]?.fitness).toBe(100 - 12 + 12 * 0.25);
  });

  it("treats AI starters as having played 90 minutes", () => {
    const { career, round } = careerAndResults();
    const results = round.map((f) => resultFor(f, 1, 1));
    const aiClub = career.league.clubs.find((c) => c.id !== career.userClubId);
    if (!aiClub) throw new Error("no AI club");

    const condition = updateConditionAfterMatchday(career, results);

    const fitnesses = aiClub.playerIds.map((id) => condition[id]?.fitness);
    expect(fitnesses.filter((f) => f === 92.5)).toHaveLength(11);
    expect(fitnesses.filter((f) => f === 100)).toHaveLength(aiClub.playerIds.length - 11);
  });

  it("does not change its input", () => {
    const { career, round } = careerAndResults();
    const frozen = deepFreeze(career);

    updateConditionAfterMatchday(
      frozen,
      round.map((f) => resultFor(f, 1, 0)),
    );

    expect(frozen).toEqual(career);
  });
});

describe("userReportWithEnergy", () => {
  it("gives the starters 90 minutes and the energy of the user's players when there is no report", () => {
    const career = aCareer();
    const [first] = career.squadPlan.starters as [string];

    const report = userReportWithEnergy(career, undefined, {
      [first]: 61,
      "other-club-player": 30,
    });

    expect(report.minutes[first]).toBe(90);
    expect(report.energy).toEqual({ [first]: 61 });
  });

  it("keeps the minutes and fatigue of an existing report", () => {
    const career = aCareer();
    const [first] = career.squadPlan.starters as [string];

    const report = userReportWithEnergy(
      career,
      { minutes: { [first]: 62 }, fatigue: { [first]: 1 } },
      { [first]: 70 },
    );

    expect(report).toEqual({
      minutes: { [first]: 62 },
      fatigue: { [first]: 1 },
      energy: { [first]: 70 },
    });
  });
});
