import { beforeAll, describe, expect, it } from "vitest";
import type { Career } from "./career";
import { completeMatchday } from "./complete-matchday";
import { computeTable } from "./compute-table";
import { createCareer } from "./create-career";
import { createSeason } from "./create-season";
import { deriveTeamProfile } from "./derive-team-profile";
import { generateLeague } from "./generate-league";
import { getNextFixture } from "./get-next-fixture";
import { simulateFixture } from "./simulate-fixture";
import { initialConditions } from "./squad-plan";

const LEAGUE_SEEDS = [1, 2, 3];
const SEASONS_PER_LEAGUE = 5;
const MATCHDAYS = 26;

type SeasonSummary = {
  goals: number;
  matches: number;
  topQuarterInTopHalf: number;
  topQuarterSize: number;
  championIsStrongest: boolean;
  conditionInBounds: boolean;
};

const careerFor = (seed: number): Career => {
  const generated = generateLeague({ seed });
  if (!generated.ok) throw new Error(generated.error);
  const created = createCareer({
    seed,
    userClubId: (generated.league.clubs[0] as { id: string }).id,
  });
  if (!created.ok) throw new Error(created.error);
  return created.career;
};

const strengthOf = (career: Career, clubId: string): number => {
  const club = career.league.clubs.find((c) => c.id === clubId);
  if (!club) throw new Error(`Unknown club ${clubId}`);
  const profile = deriveTeamProfile(club, career.league.players);
  const ratings = Object.values(profile).filter((v): v is number => typeof v === "number");
  return ratings.reduce((sum, v) => sum + v, 0) / ratings.length;
};

const playSeason = (start: Career): Career => {
  let career = start;
  for (let day = 0; day < MATCHDAYS; day++) {
    const fixture = getNextFixture(career.season, career.userClubId);
    if (!fixture) throw new Error("season ended early");
    const outcome = completeMatchday(career, simulateFixture(career, fixture));
    if (!outcome.ok) throw new Error(outcome.error);
    career = outcome.career;
  }
  return career;
};

const summarise = (finished: Career): SeasonSummary => {
  const ids = finished.league.clubs.map((c) => c.id);
  const result = computeTable(ids, finished.season.results);
  if (!result.ok) throw new Error(result.error);
  const { table } = result;
  const byStrength = [...ids].sort((a, b) => strengthOf(finished, b) - strengthOf(finished, a));
  const quarter = Math.floor(ids.length / 4);
  const topQuarter = new Set(byStrength.slice(0, quarter));
  const topHalf = new Set(table.slice(0, ids.length / 2).map((r) => r.clubId));
  return {
    goals: finished.season.results.reduce((n, r) => n + r.homeGoals + r.awayGoals, 0),
    matches: finished.season.results.length,
    topQuarterInTopHalf: [...topQuarter].filter((id) => topHalf.has(id)).length,
    topQuarterSize: quarter,
    championIsStrongest: table[0]?.clubId === byStrength[0],
    conditionInBounds: Object.values(finished.condition).every(
      (c) => c.fitness >= 0 && c.fitness <= 100 && c.form >= 1 && c.form <= 10,
    ),
  };
};

describe("season balance: full seasons of generated leagues with the real engine", () => {
  const seasons: SeasonSummary[] = [];

  beforeAll(() => {
    for (const seed of LEAGUE_SEEDS) {
      const career = careerFor(seed);
      for (let number = 1; number <= SEASONS_PER_LEAGUE; number++) {
        const ids = career.league.clubs.map((c) => c.id);
        const season = createSeason(seed, number, ids);
        seasons.push(
          summarise(
            playSeason({ ...career, season, condition: initialConditions(career.league.players) }),
          ),
        );
      }
    }
  }, 120_000);

  it("scores 2.3 to 3.1 goals per match", () => {
    const goals = seasons.reduce((n, s) => n + s.goals, 0);
    const matches = seasons.reduce((n, s) => n + s.matches, 0);
    expect(goals / matches).toBeGreaterThanOrEqual(2.3);
    expect(goals / matches).toBeLessThanOrEqual(3.1);
  });

  it("lets the strongest quarter finish in the top half at least 65% of the time", () => {
    const inTopHalf = seasons.reduce((n, s) => n + s.topQuarterInTopHalf, 0);
    const total = seasons.reduce((n, s) => n + s.topQuarterSize, 0);
    expect(inTopHalf / total).toBeGreaterThanOrEqual(0.65);
  });

  it("makes the strongest club champion in at least 25% but fewer than 85% of seasons", () => {
    const rate = seasons.filter((s) => s.championIsStrongest).length / seasons.length;
    expect(rate).toBeGreaterThanOrEqual(0.25);
    expect(rate).toBeLessThan(0.85);
  });

  it("keeps fitness within 0..100 and form within 1..10 over 5 seasons", () => {
    expect(seasons.every((s) => s.conditionInBounds)).toBe(true);
  });
});
