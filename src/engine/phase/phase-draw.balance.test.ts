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

const perMatch = (steps: readonly PhaseStep[], keep: (s: PhaseStep) => boolean): number =>
  steps.filter(keep).length / MATCHES;

describe("phase draw over seeded matches (draft ranges, retuned by #461)", () => {
  let steps: PhaseStep[] = [];
  beforeAll(() => {
    steps = playMatches();
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

  it("draws about 20 to 40 chances and few penalties a match", () => {
    between(
      perMatch(steps, (s) => s.outcome === "chance"),
      20,
      40,
    );
    between(
      perMatch(steps, (s) => s.outcome === "foul" && s.penalty),
      0,
      1,
    );
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

  it("gives an attacking mentality more chances and a high press more turnovers of the opponent in build-up", () => {
    const attacking = playMatches({ mentality: "attacking" });
    const chances = (list: readonly PhaseStep[]) =>
      list.filter((s) => s.team === "home" && s.outcome === "chance").length;
    const lostBy = (list: readonly PhaseStep[]) =>
      list.filter((s) => s.team === "away" && s.outcome === "lost").length;
    const pressing = playMatches({ pressing: "high" });

    expect(chances(attacking)).toBeGreaterThan(chances(steps));
    expect(lostBy(pressing)).toBeGreaterThan(lostBy(steps));
  });
});
