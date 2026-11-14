import { beforeAll, describe, expect, it } from "vitest";
import { type BalanceSummary, formatBalanceTable, simulateBalance } from "./balance-harness";
import { aMatchInput, aTeamProfile } from "./match-builders";
import {
  type Mentality,
  NEUTRAL_TACTICS,
  type Pressing,
  type TeamTactics,
  type Tempo,
  type Width,
} from "./tactics";

const MATCHES = 2000;
const BASE_SEED = 1;

describe("engine balance: two average teams", () => {
  let summary: BalanceSummary;

  beforeAll(() => {
    summary = simulateBalance(aMatchInput().build(), MATCHES, BASE_SEED);
    console.info(`\n${formatBalanceTable("Average vs average", summary)}\n`);
  });

  it("simulates at least 1000 matches", () => {
    expect(summary.matches).toBeGreaterThanOrEqual(1000);
  });

  it("scores 2.4 to 3.0 goals per match", () => {
    expect(summary.goalsPerMatch).toBeGreaterThanOrEqual(2.4);
    expect(summary.goalsPerMatch).toBeLessThanOrEqual(3.0);
  });

  it("takes 20 to 30 shots per match", () => {
    expect(summary.shotsPerMatch).toBeGreaterThanOrEqual(20);
    expect(summary.shotsPerMatch).toBeLessThanOrEqual(30);
  });

  it("keeps total xG within 15% of goals", () => {
    expect(Math.abs(summary.xgPerMatch - summary.goalsPerMatch)).toBeLessThanOrEqual(
      0.15 * summary.goalsPerMatch,
    );
  });

  it("draws 20% to 32% of matches", () => {
    expect(summary.drawRate).toBeGreaterThanOrEqual(0.2);
    expect(summary.drawRate).toBeLessThanOrEqual(0.32);
  });
});

describe("engine balance: clearly stronger team", () => {
  const strong = aTeamProfile("Strong").withAllRatings(0.6).build();
  const weak = aTeamProfile("Weak").withAllRatings(0.4).build();

  it("wins 60% to 75% of matches at home, and the weaker team still wins at least 10%", () => {
    const input = aMatchInput().withHome(strong).withAway(weak).build();

    const summary = simulateBalance(input, MATCHES, BASE_SEED);

    console.info(`\n${formatBalanceTable("Strong (0.6) vs weak (0.4)", summary)}\n`);
    expect(summary.homeWinRate).toBeGreaterThanOrEqual(0.6);
    expect(summary.homeWinRate).toBeLessThanOrEqual(0.75);
    expect(summary.awayWinRate).toBeGreaterThanOrEqual(0.1);
  });

  it("wins 60% to 75% of matches away, and the weaker team still wins at least 10%", () => {
    const input = aMatchInput().withHome(weak).withAway(strong).build();

    const summary = simulateBalance(input, MATCHES, BASE_SEED);

    expect(summary.awayWinRate).toBeGreaterThanOrEqual(0.6);
    expect(summary.awayWinRate).toBeLessThanOrEqual(0.75);
    expect(summary.homeWinRate).toBeGreaterThanOrEqual(0.1);
  });
});

const withTactics = (changes: Partial<TeamTactics>): TeamTactics => ({
  ...NEUTRAL_TACTICS,
  ...changes,
});

/** The home side plays `tactics` against a neutral away side; both teams are average. */
const playWith = (tactics: TeamTactics, matches = MATCHES) =>
  simulateBalance(aMatchInput().withTactics({ home: tactics }).build(), matches, BASE_SEED);

describe("engine balance: each tactic moves the statistic it targets", () => {
  let neutral: BalanceSummary;

  beforeAll(() => {
    neutral = playWith(NEUTRAL_TACTICS);
  });

  it("attacking mentality takes more shots and concedes more goals", () => {
    const s = playWith(withTactics({ mentality: "attacking" }));

    expect(s.perSide.home.shots).toBeGreaterThan(neutral.perSide.home.shots);
    expect(s.perSide.away.goals).toBeGreaterThan(neutral.perSide.away.goals);
  });

  it("defensive mentality takes fewer shots and concedes fewer goals", () => {
    const s = playWith(withTactics({ mentality: "defensive" }));

    expect(s.perSide.home.shots).toBeLessThan(neutral.perSide.home.shots);
    expect(s.perSide.away.goals).toBeLessThan(neutral.perSide.away.goals);
  });

  it("high pressing wins more turnovers in the opponent half and concedes more shots", () => {
    const s = playWith(withTactics({ pressing: "high" }));

    expect(s.perSide.home.highTurnovers).toBeGreaterThan(neutral.perSide.home.highTurnovers);
    expect(s.perSide.away.shots).toBeGreaterThan(neutral.perSide.away.shots);
  });

  it("low pressing wins fewer turnovers in the opponent half", () => {
    const s = playWith(withTactics({ pressing: "low" }));

    expect(s.perSide.home.highTurnovers).toBeLessThan(neutral.perSide.home.highTurnovers);
  });

  it("wide play makes more sideways moves and wins more corners", () => {
    const s = playWith(withTactics({ width: "wide" }));

    expect(s.perSide.home.lateralMoves).toBeGreaterThan(neutral.perSide.home.lateralMoves);
    expect(s.perSide.home.corners).toBeGreaterThan(neutral.perSide.home.corners);
  });

  it("narrow play makes fewer sideways moves and wins fewer corners", () => {
    const s = playWith(withTactics({ width: "narrow" }));

    expect(s.perSide.home.lateralMoves).toBeLessThan(neutral.perSide.home.lateralMoves);
    expect(s.perSide.home.corners).toBeLessThan(neutral.perSide.home.corners);
  });

  it("fast tempo takes more shots and concedes more shots", () => {
    const s = playWith(withTactics({ tempo: "fast" }));

    expect(s.perSide.home.shots).toBeGreaterThan(neutral.perSide.home.shots);
    expect(s.perSide.away.shots).toBeGreaterThan(neutral.perSide.away.shots);
  });

  it("slow tempo takes fewer shots and concedes fewer shots", () => {
    const s = playWith(withTactics({ tempo: "slow" }));

    expect(s.perSide.home.shots).toBeLessThan(neutral.perSide.home.shots);
    expect(s.perSide.away.shots).toBeLessThan(neutral.perSide.away.shots);
  });
});

describe("engine balance: no dominant tactic", () => {
  const COMBINATION_MATCHES = 1000;
  const mentalities: Mentality[] = ["defensive", "balanced", "attacking"];
  const pressings: Pressing[] = ["low", "medium", "high"];
  const widths: Width[] = ["narrow", "normal", "wide"];
  const tempos: Tempo[] = ["slow", "normal", "fast"];
  const combinations: TeamTactics[] = mentalities.flatMap((mentality) =>
    pressings.flatMap((pressing) =>
      widths.flatMap((width) => tempos.map((tempo) => ({ mentality, pressing, width, tempo }))),
    ),
  );
  const neutral = () => playWith(NEUTRAL_TACTICS, COMBINATION_MATCHES);
  const label = (t: TeamTactics) => `${t.mentality}/${t.pressing}/${t.width}/${t.tempo}`;

  it("covers all 81 combinations of settings", () => {
    expect(combinations).toHaveLength(81);
  });

  it("never wins more than 58% of matches against the neutral setting between equal teams", () => {
    const reference = neutral();
    const tooStrong = combinations
      .map((t) => ({ t, rate: playWith(t, COMBINATION_MATCHES).homeWinRate }))
      .filter(({ rate }) => rate > 0.58);

    expect(tooStrong.map(({ t, rate }) => `${label(t)} ${rate}`)).toEqual([]);
    expect(reference.homeWinRate).toBeLessThan(0.58);
  });

  it("is never strictly better than neutral on both goals for and goals against", () => {
    const reference = neutral();
    const dominant = combinations
      .map((t) => ({ t, s: playWith(t, COMBINATION_MATCHES) }))
      .filter(
        ({ s }) =>
          s.perSide.home.goals > reference.perSide.home.goals &&
          s.perSide.away.goals < reference.perSide.away.goals,
      );

    expect(dominant.map(({ t }) => label(t))).toEqual([]);
  });
});
