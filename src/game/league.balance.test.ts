import { beforeAll, describe, expect, it } from "vitest";
import type { TeamMatchProfile } from "../engine";
import { type BalanceSummary, simulateBalance } from "../engine/balance-harness";
import { aMatchInput } from "../engine/match-builders";
import { deriveTeamProfile } from "./derive-team-profile";
import { generateLeague } from "./generate-league";
import type { League } from "./league";

const LEAGUE_SEEDS = [1, 2, 3];
const MATCHES_PER_PAIR = 100;

type Fixture = { home: number; away: number; summary: BalanceSummary };

const meanRating = (values: Record<string, number | string>): number => {
  const ratings = Object.values(values).filter((v): v is number => typeof v === "number");
  return ratings.reduce((sum, v) => sum + v, 0) / ratings.length;
};

const leagueFor = (seed: number): League => {
  const result = generateLeague({ seed });
  if (!result.ok) throw new Error(result.error);
  return result.league;
};

/** Every ordered pair of clubs, 100 seeded matches each, with the real engine. */
const simulateLeague = (league: League, leagueSeed: number) => {
  const profiles = league.clubs.map((club) => deriveTeamProfile(club, league.players));
  const strengths = profiles.map(meanRating);
  const fixtures: Fixture[] = [];
  for (let home = 0; home < profiles.length; home++) {
    for (let away = 0; away < profiles.length; away++) {
      if (home === away) continue;
      const input = aMatchInput()
        .withHome(profiles[home] as TeamMatchProfile)
        .withAway(profiles[away] as TeamMatchProfile)
        .build();
      const baseSeed = leagueSeed * 1_000_000 + (home * profiles.length + away) * MATCHES_PER_PAIR;
      fixtures.push({ home, away, summary: simulateBalance(input, MATCHES_PER_PAIR, baseSeed) });
    }
  }
  return { strengths, fixtures };
};

const sum = (fixtures: Fixture[], pick: (s: BalanceSummary) => number): number =>
  fixtures.reduce((total, f) => total + pick(f.summary) * f.summary.matches, 0);

describe("league balance: generated leagues with the real engine", () => {
  let fixtures: Fixture[] = [];
  let strongVsWeakWinRate = 0;

  beforeAll(() => {
    for (const seed of LEAGUE_SEEDS) {
      const league = leagueFor(seed);
      const result = simulateLeague(league, seed);
      fixtures = fixtures.concat(result.fixtures);

      const order = result.strengths
        .map((strength, index) => ({ strength, index }))
        .sort((a, b) => b.strength - a.strength)
        .map((entry) => entry.index);
      const quarter = Math.floor(order.length / 4);
      const strong = new Set(order.slice(0, quarter));
      const weak = new Set(order.slice(-quarter));
      const duels = result.fixtures.filter(
        (f) => (strong.has(f.home) && weak.has(f.away)) || (weak.has(f.home) && strong.has(f.away)),
      );
      const wins = duels.reduce((total, f) => {
        const rate = strong.has(f.home) ? f.summary.homeWinRate : f.summary.awayWinRate;
        return total + rate * f.summary.matches;
      }, 0);
      strongVsWeakWinRate += wins / duels.reduce((n, f) => n + f.summary.matches, 0);
    }
    strongVsWeakWinRate /= LEAGUE_SEEDS.length;
  }, 120_000);

  const total = () => sum(fixtures, () => 1);

  it("scores 2.3 to 3.1 goals per match", () => {
    const goals = sum(fixtures, (s) => s.goalsPerMatch) / total();
    expect(goals).toBeGreaterThanOrEqual(2.3);
    expect(goals).toBeLessThanOrEqual(3.1);
  });

  it("keeps total xG within 15% of goals", () => {
    const goals = sum(fixtures, (s) => s.goalsPerMatch);
    const xg = sum(fixtures, (s) => s.xgPerMatch);
    expect(Math.abs(xg - goals)).toBeLessThanOrEqual(0.15 * goals);
  });

  it("lets the strongest quarter beat the weakest quarter 60% to 90% of the time", () => {
    expect(strongVsWeakWinRate).toBeGreaterThanOrEqual(0.6);
    expect(strongVsWeakWinRate).toBeLessThanOrEqual(0.9);
  });

  it("draws 18% to 32% of matches", () => {
    const draws = sum(fixtures, (s) => s.drawRate) / total();
    expect(draws).toBeGreaterThanOrEqual(0.18);
    expect(draws).toBeLessThanOrEqual(0.32);
  });
});
