import { beforeAll, describe, expect, it } from "vitest";
import { aTeamSheet } from "../action/action-builders";
import { BASE_SEED, between } from "../action/balance-test-support";
import { NEUTRAL_TACTICS, type TeamTactics } from "../tactics";
import type { PhaseStep } from "./phase-step";
import { drawHalf } from "./simulate-steps";

const MATCHES = 200;
const HALF_SECONDS = 2700;

const playMatches = (home: Partial<TeamTactics> = {}, away: Partial<TeamTactics> = {}) => {
  const sheets = {
    home: aTeamSheet("Home", "h")
      .withTactics({ ...NEUTRAL_TACTICS, ...home })
      .build(),
    away: aTeamSheet("Away", "a")
      .withTactics({ ...NEUTRAL_TACTICS, ...away })
      .build(),
  };
  const steps: PhaseStep[] = [];
  for (let i = 0; i < MATCHES; i++) {
    steps.push(...drawHalf(sheets, BASE_SEED + i, HALF_SECONDS));
    steps.push(...drawHalf(sheets, BASE_SEED + 5000 + i, HALF_SECONDS));
  }
  return steps;
};

type Shot = Extract<PhaseStep, { outcome: "chance" }>["chance"];

const shotsOf = (steps: readonly PhaseStep[]): Shot[] =>
  steps.flatMap((s) => (s.outcome === "chance" ? [s.chance] : []));

const shotsPerMatch = (steps: readonly PhaseStep[], keep: (c: Shot) => boolean): number =>
  shotsOf(steps).filter(keep).length / MATCHES;

const xgPerMatch = (steps: readonly PhaseStep[]): number =>
  shotsOf(steps).reduce((sum, c) => sum + c.xg, 0) / MATCHES;

const perMatch = (steps: readonly PhaseStep[], keep: (s: PhaseStep) => boolean): number =>
  steps.filter(keep).length / MATCHES;

describe("phase draw over seeded matches (ranges set by #461)", () => {
  let steps: PhaseStep[] = [];
  beforeAll(() => {
    steps = playMatches();
    const results = ["goal", "saved", "woodwork", "blocked", "wide", "over"]
      .map((r) => `${r} ${shotsPerMatch(steps, (c) => c.result === r).toFixed(2)}`)
      .join(", ");
    console.info(
      `Shots ${shotsPerMatch(steps, () => true).toFixed(1)}, xG ${xgPerMatch(steps).toFixed(2)}, clear chances ${shotsPerMatch(steps, (c) => c.xg >= 0.25).toFixed(2)}; ${results}`,
    );
    console.info(
      `Steps per match ${perMatch(steps, () => true).toFixed(0)}, chances ${perMatch(steps, (s) => s.outcome === "chance").toFixed(1)}, fouls ${perMatch(steps, (s) => s.outcome === "foul").toFixed(1)}`,
    );
  });

  it("plays 250 to 400 steps a match", () => {
    between(
      perMatch(steps, () => true),
      250,
      400,
    );
  });

  it("lets turnovers dominate and fouls and exits stay a minority", () => {
    const lost = perMatch(steps, (s) => s.outcome === "lost");
    const total = perMatch(steps, () => true);

    expect(lost / total).toBeGreaterThan(0.6);
    between(
      perMatch(steps, (s) => s.outcome === "foul"),
      15,
      35,
    );
    between(
      perMatch(steps, (s) => s.outcome === "outOfPlay"),
      15,
      45,
    );
  });

  it("draws 20 to 30 chances and few penalties a match", () => {
    between(
      perMatch(steps, (s) => s.outcome === "chance"),
      20,
      30,
    );
    between(
      perMatch(steps, (s) => s.outcome === "foul" && s.penalty),
      0,
      1,
    );
  });

  it("scores 2.4 to 3.0 goals a match with total xG within 15% of the goals", () => {
    const goals = shotsPerMatch(steps, (c) => c.result === "goal");

    between(goals, 2.4, 3);
    between(xgPerMatch(steps) / goals, 0.85, 1.15);
  });

  it("creates 4 to 8 clear chances (xG of 0.25 or more) a match", () => {
    between(
      shotsPerMatch(steps, (c) => c.xg >= 0.25),
      4,
      8,
    );
  });

  it("gives every result a share of the shots, near misses included", () => {
    const total = shotsPerMatch(steps, () => true);
    for (const result of ["saved", "woodwork", "blocked", "wide", "over"] as const) {
      const share = shotsPerMatch(steps, (c) => c.result === result) / total;
      expect(share, result).toBeGreaterThan(0.01);
    }
  });

  it("splits the possessions evenly between two equal sides", () => {
    const home = steps.filter((s) => s.team === "home").length / steps.length;

    between(home, 0.47, 0.53);
  });

  it("draws shorter steps for a fast tempo and longer ones for a slow tempo", () => {
    const average = (list: readonly PhaseStep[]) =>
      list.reduce((sum, s) => sum + s.endTime - s.startTime, 0) / list.length;
    const fast = playMatches({ tempo: "fast" }, { tempo: "fast" });
    const slow = playMatches({ tempo: "slow" }, { tempo: "slow" });

    expect(average(fast)).toBeLessThan(average(steps));
    expect(average(slow)).toBeGreaterThan(average(steps));
  });

  it("gives an attacking mentality more chances and a high press fewer chances to the opponent", () => {
    const attacking = playMatches({ mentality: "attacking" });
    const chances = (list: readonly PhaseStep[]) =>
      list.filter((s) => s.team === "home" && s.outcome === "chance").length;
    // Restarts only: a ball won in open play also carries the space a high press leaves behind.
    const chanceShareBy = (list: readonly PhaseStep[]) => {
      const built = list.filter(
        (s) => s.team === "away" && (s.start === "goalKick" || s.start === "throwIn"),
      );
      return built.filter((s) => s.outcome === "chance").length / built.length;
    };
    const pressing = playMatches({ pressing: "high" });

    expect(chances(attacking)).toBeGreaterThan(chances(steps));
    expect(chanceShareBy(pressing)).toBeLessThan(chanceShareBy(steps));
  });
});
