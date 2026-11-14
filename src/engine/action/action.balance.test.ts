import { beforeAll, describe, expect, it } from "vitest";
import {
  type Mentality,
  NEUTRAL_TACTICS,
  type Pressing,
  type TeamTactics,
  type Tempo,
  type Width,
} from "../tactics";
import {
  type ActionBalanceSummary,
  formatBalanceTable,
  simulateActionBalance,
} from "./action-balance";
import { aMatchInputV2, aTeamSheet } from "./action-builders";

const MATCHES = 1000;
const BASE_SEED = 1;
const AVERAGE = 10;
const STRONGER = AVERAGE + 4;

const between = (value: number, min: number, max: number) => {
  expect(value).toBeGreaterThanOrEqual(min);
  expect(value).toBeLessThanOrEqual(max);
};

describe("action engine balance: two average teams", () => {
  let s: ActionBalanceSummary;

  beforeAll(() => {
    s = simulateActionBalance(aMatchInputV2().build(), MATCHES, BASE_SEED);
    console.info(`\n${formatBalanceTable("v2: average vs average", s)}\n`);
  }, 300_000);

  it("simulates at least 1000 matches", () => {
    expect(s.matches).toBeGreaterThanOrEqual(1000);
  });
  it("scores 2.4 to 3.0 goals per match", () => between(s.goalsPerMatch, 2.4, 3.0));
  it("takes 20 to 30 shots per match", () => between(s.shotsPerMatch, 20, 30));
  it("plays 800 to 1100 passes per match", () => between(s.passesPerMatch, 800, 1100));
  it("completes 75% to 88% of passes", () => between(s.passCompletion, 0.75, 0.88));
  it("takes 8 to 12 corners per match", () => between(s.cornersPerMatch, 8, 12));
  it("commits 20 to 28 fouls per match", () => between(s.foulsPerMatch, 20, 28));
  it("takes 35 to 50 throw-ins per match", () => between(s.throwInsPerMatch, 35, 50));
  it("awards 0.2 to 0.4 penalties per match", () => between(s.penaltiesPerMatch, 0.2, 0.4));
  it("keeps total xG within 15% of goals", () => {
    expect(Math.abs(s.xgPerMatch - s.goalsPerMatch)).toBeLessThanOrEqual(0.15 * s.goalsPerMatch);
  });
  it("is won by the home side in 42% to 48% of matches", () => between(s.homeWinRate, 0.42, 0.48));
  it("draws 20% to 32% of matches", () => between(s.drawRate, 0.2, 0.32));
});

describe("action engine balance: clearly stronger team", () => {
  const strong = aTeamSheet("Strong", "s").withAllAttributes(STRONGER).build();
  const weak = aTeamSheet("Weak", "w").build();

  it("wins 55% to 80% at home, and the weaker team still wins at least 10%", () => {
    const input = aMatchInputV2().withHome(strong).withAway(weak).build();

    const s = simulateActionBalance(input, MATCHES, BASE_SEED);

    console.info(`\n${formatBalanceTable("v2: strong (14) at home vs average (10)", s)}\n`);
    between(s.homeWinRate, 0.55, 0.8);
    expect(s.awayWinRate).toBeGreaterThanOrEqual(0.1);
  });

  it("wins 55% to 80% away, and the weaker team still wins at least 10%", () => {
    const input = aMatchInputV2().withHome(weak).withAway(strong).build();

    const s = simulateActionBalance(input, MATCHES, BASE_SEED);

    between(s.awayWinRate, 0.55, 0.8);
    expect(s.homeWinRate).toBeGreaterThanOrEqual(0.1);
  });
});

const withTactics = (changes: Partial<TeamTactics>): TeamTactics => ({
  ...NEUTRAL_TACTICS,
  ...changes,
});

/** The home side plays `tactics` against a neutral away side; both teams are average. */
const playWith = (tactics: TeamTactics, matches = MATCHES) =>
  simulateActionBalance(
    aMatchInputV2().withHome(aTeamSheet("Home", "h").withTactics(tactics).build()).build(),
    matches,
    BASE_SEED,
  );

describe("action engine balance: each tactic moves the statistic it targets", () => {
  let neutral: ActionBalanceSummary;

  beforeAll(() => {
    neutral = playWith(NEUTRAL_TACTICS);
  }, 300_000);

  it("high pressing wins more turnovers high up and concedes more counters than low pressing", () => {
    const high = playWith(withTactics({ pressing: "high" }));
    const low = playWith(withTactics({ pressing: "low" }));

    expect(high.perSide.home.highTurnovers).toBeGreaterThan(low.perSide.home.highTurnovers);
    expect(high.perSide.away.countersConceded).toBeGreaterThan(low.perSide.away.countersConceded);
    expect(high.perSide.home.highTurnovers).toBeGreaterThan(neutral.perSide.home.highTurnovers);
  });

  it("wide play makes more crosses and wins more corners than neutral", () => {
    const s = playWith(withTactics({ width: "wide" }));

    expect(s.perSide.home.crosses).toBeGreaterThan(neutral.perSide.home.crosses);
    expect(s.perSide.home.corners).toBeGreaterThan(neutral.perSide.home.corners);
  });

  it("narrow play takes more central shots than neutral", () => {
    const s = playWith(withTactics({ width: "narrow" }));

    expect(s.perSide.home.centralShots).toBeGreaterThan(neutral.perSide.home.centralShots);
  });

  it("fast tempo makes more actions per match than neutral", () => {
    const s = playWith(withTactics({ tempo: "fast" }));

    expect(s.actionsPerMatch).toBeGreaterThan(neutral.actionsPerMatch);
  });

  it("attacking mentality takes and concedes more shots than neutral", () => {
    const s = playWith(withTactics({ mentality: "attacking" }));

    expect(s.perSide.home.shots).toBeGreaterThan(neutral.perSide.home.shots);
    expect(s.perSide.away.shots).toBeGreaterThan(neutral.perSide.away.shots);
  });
});

describe("action engine balance: no dominant tactic", () => {
  const COMBINATION_MATCHES = 500;
  const mentalities: Mentality[] = ["defensive", "balanced", "attacking"];
  const pressings: Pressing[] = ["low", "medium", "high"];
  const widths: Width[] = ["narrow", "normal", "wide"];
  const tempos: Tempo[] = ["slow", "normal", "fast"];
  const combinations: TeamTactics[] = mentalities.flatMap((mentality) =>
    pressings.flatMap((pressing) =>
      widths.flatMap((width) => tempos.map((tempo) => ({ mentality, pressing, width, tempo }))),
    ),
  );
  const label = (t: TeamTactics) => `${t.mentality}/${t.pressing}/${t.width}/${t.tempo}`;
  let reference: ActionBalanceSummary;
  let results: { t: TeamTactics; s: ActionBalanceSummary }[];

  beforeAll(() => {
    reference = playWith(NEUTRAL_TACTICS, COMBINATION_MATCHES);
    results = combinations.map((t) => ({ t, s: playWith(t, COMBINATION_MATCHES) }));
  }, 1_200_000);

  it("covers all 81 combinations of settings", () => {
    expect(combinations).toHaveLength(81);
  });

  it("never wins more than 58% of matches against the neutral setting between equal teams", () => {
    const tooStrong = results.filter(({ s }) => s.homeWinRate > 0.58);

    expect(tooStrong.map(({ t, s }) => `${label(t)} ${s.homeWinRate}`)).toEqual([]);
    expect(reference.homeWinRate).toBeLessThan(0.58);
  });

  it("is never strictly better than neutral on both goals for and goals against", () => {
    const dominant = results.filter(
      ({ s }) =>
        s.perSide.home.goals > reference.perSide.home.goals &&
        s.perSide.away.goals < reference.perSide.away.goals,
    );

    expect(dominant.map(({ t }) => label(t))).toEqual([]);
  });
});
