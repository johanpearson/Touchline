import { describe, expect, it } from "vitest";
import { aCareer, deepFreeze } from "./career-builders";
import { parseCareer } from "./parse-career";
import {
  RETIREMENT_CERTAIN_AGE,
  RETIREMENT_START_AGE,
  retirementChance,
  retirePlayers,
} from "./retire-players";
import { summariseSeason } from "./summarise-season";

const base = aCareer(6);

/** The career with every player given the same age, so retirement is decided by age alone. */
const allAged = (age: number) =>
  deepFreeze({
    ...base,
    league: { ...base.league, players: base.league.players.map((p) => ({ ...p, age })) },
  });

describe("retirementChance", () => {
  it("is zero before 34", () => {
    expect(retirementChance(RETIREMENT_START_AGE - 1)).toBe(0);
    expect(retirementChance(20)).toBe(0);
  });

  it("is 15% at 34 and rises 15 points a year", () => {
    expect(retirementChance(34)).toBeCloseTo(0.15);
    expect(retirementChance(35)).toBeCloseTo(0.3);
    expect(retirementChance(37)).toBeCloseTo(0.6);
  });

  it("is certain at 38 and above", () => {
    expect(retirementChance(RETIREMENT_CERTAIN_AGE)).toBe(1);
    expect(retirementChance(41)).toBe(1);
  });
});

describe("retirePlayers", () => {
  it("never retires anyone younger than 34", () => {
    const career = allAged(33);
    expect(retirePlayers(career)).toBe(career);
  });

  it("retires everyone aged 38 and above", () => {
    const result = retirePlayers(allAged(38));
    expect(result.league.players).toEqual([]);
    expect(result.league.clubs.every((c) => c.playerIds.length === 0)).toBe(true);
  });

  it("retires some but not all players aged 34", () => {
    const result = retirePlayers(allAged(34));
    const left = result.league.players.length;
    expect(left).toBeGreaterThan(0);
    expect(left).toBeLessThan(base.league.players.length);
  });

  it("is deterministic for a seed and differs between seasons", () => {
    const aged = allAged(35);
    expect(retirePlayers(aged)).toEqual(retirePlayers(aged));
    const nextSeason = { ...aged, season: { ...aged.season, number: 2 } };
    expect(retirePlayers(nextSeason).league.players.map((p) => p.id)).not.toEqual(
      retirePlayers(aged).league.players.map((p) => p.id),
    );
  });

  it("does not depend on the order of the players", () => {
    const aged = allAged(35);
    const reversed = {
      ...aged,
      league: { ...aged.league, players: [...aged.league.players].reverse() },
    };
    const ids = (c: typeof aged) => c.league.players.map((p) => p.id).sort();
    expect(ids(retirePlayers(reversed))).toEqual(ids(retirePlayers(aged)));
  });

  it("removes retirees from clubs, free agents, contracts, condition and minutes", () => {
    const free = base.league.clubs[0]?.playerIds[0] as string;
    const aged = deepFreeze({
      ...allAged(38),
      freeAgentIds: [free],
      league: {
        ...base.league,
        clubs: base.league.clubs.map((c, i) =>
          i === 0 ? { ...c, playerIds: c.playerIds.slice(1) } : c,
        ),
        players: base.league.players.map((p) => ({ ...p, age: 38 })),
      },
    });
    const result = retirePlayers(aged);
    expect(result.freeAgentIds).toEqual([]);
    expect(result.contracts).toEqual({});
    expect(result.condition).toEqual({});
    expect(result.minutes).toEqual({});
  });

  it("keeps the career parseable and the finances unchanged", () => {
    const other = base.league.clubs.find((c) => c.id !== base.userClubId);
    const leaving = new Set([base.squadPlan.starters[4], ...(other?.playerIds.slice(0, 3) ?? [])]);
    const partial = {
      ...base,
      league: {
        ...base.league,
        players: base.league.players.map((p) => ({ ...p, age: leaving.has(p.id) ? 38 : 25 })),
      },
    };
    const result = retirePlayers(partial);
    expect(result.league.players).toHaveLength(base.league.players.length - 4);
    expect(result.finances).toBe(partial.finances);
    expect(parseCareer(JSON.parse(JSON.stringify(result))).ok).toBe(true);
  });

  it("repairs the user's squad plan when a starter or substitute retires", () => {
    const retiring = new Set([base.squadPlan.starters[2], base.squadPlan.bench[0]]);
    const career = deepFreeze({
      ...base,
      league: {
        ...base.league,
        players: base.league.players.map((p) => ({ ...p, age: retiring.has(p.id) ? 38 : 25 })),
      },
    });
    const plan = retirePlayers(career).squadPlan;
    expect(plan.formation).toBe(base.squadPlan.formation);
    expect(plan.tactics).toBe(base.squadPlan.tactics);
    for (const id of [...plan.starters, ...plan.bench]) expect(retiring.has(id)).toBe(false);
    expect(plan.starters).toHaveLength(11);
  });
});

describe("retirement and the season summary", () => {
  it("keeps a retired top scorer in the summary captured before the retirement", () => {
    const finished = scoredSeason();
    const summary = summariseSeason(finished.career);
    if (!summary.ok) throw new Error(summary.error);
    const career = { ...finished.career, history: [summary.summary] };
    const retired = retirePlayers({
      ...career,
      league: {
        ...career.league,
        players: career.league.players.map((p) =>
          p.id === finished.scorerId ? { ...p, age: 38 } : p,
        ),
      },
    });
    expect(retired.league.players.some((p) => p.id === finished.scorerId)).toBe(false);
    expect(parseCareer(JSON.parse(JSON.stringify(retired))).ok).toBe(true);
    const again = summariseSeason(retired);
    expect(again.ok && again.summary.topScorers[0]?.name).toBe(finished.scorerName);
    expect(retired.history[0]?.topScorers[0]?.name).toBe(finished.scorerName);
  });
});

/** A finished season in which one known player of the first club scored every goal. */
const scoredSeason = () => {
  const club = base.league.clubs[0] as { id: string; playerIds: string[] };
  const scorerId = club.playerIds[10] as string;
  const scorerName = base.league.players.find((p) => p.id === scorerId)?.name as string;
  const fixtures = base.season.fixtures;
  const results = fixtures.map((f) => {
    const homeGoals = f.homeClubId === club.id ? 1 : 0;
    const awayGoals = f.awayClubId === club.id ? 1 : 0;
    return {
      fixtureId: f.id,
      homeClubId: f.homeClubId,
      awayClubId: f.awayClubId,
      homeGoals,
      awayGoals,
      engineVersion: 2 as const,
      scorers: homeGoals + awayGoals > 0 ? [scorerId] : [],
    };
  });
  const career = {
    ...base,
    season: { ...base.season, results, currentMatchday: 27 },
  };
  return { career, scorerId, scorerName };
};
