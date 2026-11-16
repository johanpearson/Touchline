import { beforeAll, describe, expect, it } from "vitest";
import {
  type ActionBalanceSummary as BalanceSummary,
  simulateActionBalance,
} from "../engine/action/action-balance";
import type { Career } from "./career";
import { createCareer } from "./create-career";
import { generateLeague } from "./generate-league";
import { deriveClubLineRatings } from "./line-ratings";
import { matchInputFor } from "./match-input-for";

const LEAGUE_SEEDS = [1, 2];
/** A full match takes about 30 ms on the fast path, so 12 matches per ordered pair keeps this under a few minutes. */
const MATCHES_PER_PAIR = 12;

type Fixture = { home: number; away: number; summary: BalanceSummary };

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

/** Every ordered pair of clubs, seeded matches each, with the real engine and each club's 4-4-2 best eleven. */
const simulateLeague = (career: Career, leagueSeed: number) => {
  const { clubs, players } = career.league;
  const strengths = clubs.map((club) => deriveClubLineRatings(club, players).overall);
  const fixtures: Fixture[] = [];
  for (let home = 0; home < clubs.length; home++) {
    for (let away = 0; away < clubs.length; away++) {
      if (home === away) continue;
      const input = matchInputFor(career, {
        id: `${home}-${away}`,
        matchday: 1,
        homeClubId: (clubs[home] as { id: string }).id,
        awayClubId: (clubs[away] as { id: string }).id,
      });
      const baseSeed = leagueSeed * 1_000_000 + (home * clubs.length + away) * MATCHES_PER_PAIR;
      fixtures.push({
        home,
        away,
        summary: simulateActionBalance(input, MATCHES_PER_PAIR, baseSeed),
      });
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
      const result = simulateLeague(careerFor(seed), seed);
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
  }, 600_000);

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
