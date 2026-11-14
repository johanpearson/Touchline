import { describe, expect, it } from "vitest";
import { aCareer, deepFreeze } from "./career-builders";
import type { Result } from "./compute-table";
import { updateConditionAfterMatchday } from "./update-condition";

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
