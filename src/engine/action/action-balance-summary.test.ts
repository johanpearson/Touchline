import { describe, expect, it } from "vitest";
import {
  type ActionBalanceSummary,
  type ActionSideAverages,
  formatBalanceTable,
  simulateActionBalance,
} from "./action-balance";
import { matchMetrics } from "./action-balance-metrics";
import { aMatchInputV2 } from "./action-builders";
import { createActionMatch } from "./create-action-match";

const input = aMatchInputV2().build();

const play = (seed: number) => {
  const match = createActionMatch(input, seed, { detail: "fast" });
  match.advanceTo(1_000_000);
  match.resume();
  match.advanceTo(1_000_000);
  return match;
};

describe("simulateActionBalance against an independent replay", () => {
  const seeds = [11, 12, 13];
  const replays = seeds.map(play);
  const summary = simulateActionBalance(input, seeds.length, seeds[0] as number);
  const mean = (pick: (i: number) => number) =>
    seeds.reduce((s, _, i) => s + pick(i), 0) / seeds.length;

  it("averages goals per side over the matches", () => {
    expect(summary.perSide.home.goals).toBeCloseTo(
      mean((i) => replays[i]?.state.score.home ?? 0),
      9,
    );
    expect(summary.perSide.away.goals).toBeCloseTo(
      mean((i) => replays[i]?.state.score.away ?? 0),
      9,
    );
    expect(summary.goalsPerMatch).toBeCloseTo(
      mean((i) => (replays[i]?.state.score.home ?? 0) + (replays[i]?.state.score.away ?? 0)),
      9,
    );
  });

  it.each([
    "shots",
    "shotsOnTarget",
    "xg",
    "passes",
    "completedPasses",
    "corners",
    "fouls",
    "throwIns",
    "goalKicks",
    "penalties",
    "highTurnovers",
    "countersConceded",
    "crosses",
    "centralShots",
    "actions",
  ] as const)("averages %s per side from the metrics of each replayed match", (key) => {
    for (const side of ["home", "away"] as const) {
      const expected = mean((i) => matchMetrics(replays[i]?.events ?? [])[key][side]);
      expect(summary.perSide[side][key]).toBeCloseTo(expected, 9);
    }
  });

  it("sums both sides for the per-match totals and derives pass completion from the totals", () => {
    const totalPasses = mean((i) => {
      const m = matchMetrics(replays[i]?.events ?? []);
      return m.passes.home + m.passes.away;
    });
    const totalCompleted = mean((i) => {
      const m = matchMetrics(replays[i]?.events ?? []);
      return m.completedPasses.home + m.completedPasses.away;
    });
    expect(summary.passesPerMatch).toBeCloseTo(totalPasses, 9);
    expect(summary.passCompletion).toBeCloseTo(totalCompleted / totalPasses, 9);
    const perSideCompletion = summary.perSide.home.passCompletion;
    const home = (key: "passes" | "completedPasses") =>
      mean((i) => matchMetrics(replays[i]?.events ?? [])[key].home);
    expect(perSideCompletion).toBeCloseTo(home("completedPasses") / home("passes"), 9);
  });

  it("counts home wins, draws and away wins from the final scores", () => {
    const outcomes = replays.map((m) => Math.sign(m.state.score.home - m.state.score.away));
    expect(summary.homeWinRate).toBeCloseTo(outcomes.filter((o) => o > 0).length / seeds.length, 9);
    expect(summary.drawRate).toBeCloseTo(outcomes.filter((o) => o === 0).length / seeds.length, 9);
    expect(summary.awayWinRate).toBeCloseTo(outcomes.filter((o) => o < 0).length / seeds.length, 9);
  });

  it("uses a different seed for each match, counting up from the base seed", () => {
    const shifted = simulateActionBalance(input, seeds.length, (seeds[0] as number) + 1);
    expect(shifted.actionsPerMatch).not.toBe(summary.actionsPerMatch);
  });

  it("reports the number of matches and accepts a single match", () => {
    expect(summary.matches).toBe(3);
    expect(simulateActionBalance(input, 1, 5).matches).toBe(1);
  });

  it("rejects zero, negative and fractional match counts with the count in the message", () => {
    expect(() => simulateActionBalance(input, 0, 1)).toThrow(RangeError);
    expect(() => simulateActionBalance(input, -2, 1)).toThrow(
      "Match count must be a positive integer: -2",
    );
    expect(() => simulateActionBalance(input, 1.5, 1)).toThrow(RangeError);
  });
});

describe("formatBalanceTable", () => {
  const side = (n: number): ActionSideAverages => ({
    goals: n + 0.101,
    shots: n + 0.202,
    shotsOnTarget: n + 0.303,
    xg: n + 0.404,
    passes: n + 0.505,
    completedPasses: n + 0.606,
    passCompletion: 0.5 + n / 100,
    corners: n + 0.717,
    fouls: n + 0.808,
    throwIns: n + 0.909,
    goalKicks: n + 0.111,
    penalties: n + 0.222,
    highTurnovers: n + 0.333,
    countersConceded: n + 0.444,
    crosses: n + 0.555,
    centralShots: n + 0.666,
    actions: n + 0.777,
  });
  const summary: ActionBalanceSummary = {
    matches: 40,
    goalsPerMatch: 0,
    shotsPerMatch: 0,
    xgPerMatch: 0,
    passesPerMatch: 0,
    passCompletion: 0.812,
    cornersPerMatch: 0,
    foulsPerMatch: 0,
    throwInsPerMatch: 0,
    goalKicksPerMatch: 0,
    penaltiesPerMatch: 0,
    actionsPerMatch: 0,
    homeWinRate: 0.45,
    drawRate: 0.25,
    awayWinRate: 0.3,
    perSide: { home: side(1), away: side(2) },
  };

  it("prints the exact markdown table with every row, rounded as documented", () => {
    expect(formatBalanceTable("Test", summary).split("\n")).toEqual([
      "**Test** (40 matches)",
      "",
      "| Metric | Per match | Home | Away |",
      "|---|---|---|---|",
      "| Goals | 3.20 | 1.10 | 2.10 |",
      "| Shots | 3.4 | 1.2 | 2.2 |",
      "| Shots on target | 3.6 | 1.3 | 2.3 |",
      "| xG | 3.81 | 1.40 | 2.40 |",
      "| Passes | 4 | 2 | 3 |",
      "| Completed passes | 4 | 2 | 3 |",
      "| Pass completion | 81.2% | 51.0% | 52.0% |",
      "| Corners | 4.4 | 1.7 | 2.7 |",
      "| Fouls | 4.6 | 1.8 | 2.8 |",
      "| Throw-ins | 4.8 | 1.9 | 2.9 |",
      "| Goal kicks | 3.2 | 1.1 | 2.1 |",
      "| Penalties | 3.44 | 1.22 | 2.22 |",
      "| High turnovers | 3.7 | 1.3 | 2.3 |",
      "| Shots conceded on counters | 3.89 | 1.44 | 2.44 |",
      "| Crosses | 4.1 | 1.6 | 2.6 |",
      "| Central shots | 4.3 | 1.7 | 2.7 |",
      "| Actions | 5 | 2 | 3 |",
      "| Home / draw / away | 45.0% / 25.0% / 30.0% | | |",
    ]);
  });
});
