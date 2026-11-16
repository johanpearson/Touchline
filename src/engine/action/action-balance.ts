import type { Side } from "../match-state";
import type { PerSide } from "../match-stats";
import { type MatchMetrics, matchMetrics } from "./action-balance-metrics";
import { createActionMatch } from "./create-action-match";
import type { MatchInput } from "./match-input";

/** Per-match averages for one side. */
export type ActionSideAverages = {
  goals: number;
  shots: number;
  shotsOnTarget: number;
  xg: number;
  passes: number;
  completedPasses: number;
  /** Completed share of all passes (total completed over total passes). */
  passCompletion: number;
  corners: number;
  /** Fouls committed. */
  fouls: number;
  throwIns: number;
  goalKicks: number;
  /** Penalties awarded. */
  penalties: number;
  /** Turnovers won in the opponent half. */
  highTurnovers: number;
  /** Shots conceded within 20 s of the opponent winning the ball. */
  countersConceded: number;
  crosses: number;
  centralShots: number;
  actions: number;
};

/** Averages and rates over many simulated matches. Win rates are from the home side's view. */
export type ActionBalanceSummary = {
  matches: number;
  goalsPerMatch: number;
  shotsPerMatch: number;
  xgPerMatch: number;
  passesPerMatch: number;
  passCompletion: number;
  cornersPerMatch: number;
  foulsPerMatch: number;
  throwInsPerMatch: number;
  goalKicksPerMatch: number;
  penaltiesPerMatch: number;
  actionsPerMatch: number;
  homeWinRate: number;
  drawRate: number;
  awayWinRate: number;
  perSide: PerSide<ActionSideAverages>;
};

const PLAY_ON = 1_000_000;
const SIDES: readonly Side[] = ["home", "away"];
const COUNT_KEYS = [
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
] as const satisfies readonly (keyof MatchMetrics)[];

type Totals = Record<(typeof COUNT_KEYS)[number] | "goals", number>;

const emptyTotals = (): Totals => ({
  goals: 0,
  shots: 0,
  shotsOnTarget: 0,
  xg: 0,
  passes: 0,
  completedPasses: 0,
  corners: 0,
  fouls: 0,
  throwIns: 0,
  goalKicks: 0,
  penalties: 0,
  highTurnovers: 0,
  countersConceded: 0,
  crosses: 0,
  centralShots: 0,
  actions: 0,
});

const playFastMatch = (input: MatchInput, seed: number) => {
  const match = createActionMatch(input, seed, { detail: "fast" });
  match.advanceTo(PLAY_ON);
  match.resume();
  match.advanceTo(PLAY_ON);
  return match;
};

const averaged = (totals: Totals, matches: number): ActionSideAverages => ({
  goals: totals.goals / matches,
  shots: totals.shots / matches,
  shotsOnTarget: totals.shotsOnTarget / matches,
  xg: totals.xg / matches,
  passes: totals.passes / matches,
  completedPasses: totals.completedPasses / matches,
  passCompletion: totals.passes === 0 ? 0 : totals.completedPasses / totals.passes,
  corners: totals.corners / matches,
  fouls: totals.fouls / matches,
  throwIns: totals.throwIns / matches,
  goalKicks: totals.goalKicks / matches,
  penalties: totals.penalties / matches,
  highTurnovers: totals.highTurnovers / matches,
  countersConceded: totals.countersConceded / matches,
  crosses: totals.crosses / matches,
  centralShots: totals.centralShots / matches,
  actions: totals.actions / matches,
});

/**
 * Simulates `matches` action-engine matches on the fast path with seeds `baseSeed`, `baseSeed + 1`,
 * ... and summarises them. Deterministic: the same arguments always give the same summary.
 */
export const simulateActionBalance = (
  input: MatchInput,
  matches: number,
  baseSeed: number,
): ActionBalanceSummary => {
  if (!Number.isInteger(matches) || matches < 1) {
    throw new RangeError(`Match count must be a positive integer: ${matches}`);
  }
  const totals: PerSide<Totals> = { home: emptyTotals(), away: emptyTotals() };
  let homeWins = 0;
  let draws = 0;
  for (let i = 0; i < matches; i++) {
    const match = playFastMatch(input, baseSeed + i);
    const metrics = matchMetrics(match.events);
    const { home, away } = match.state.score;
    for (const side of SIDES) {
      totals[side].goals += match.state.score[side];
      for (const key of COUNT_KEYS) totals[side][key] += metrics[key][side];
    }
    if (home > away) homeWins += 1;
    else if (home === away) draws += 1;
  }
  const perSide = {
    home: averaged(totals.home, matches),
    away: averaged(totals.away, matches),
  };
  const both = (key: keyof ActionSideAverages) => perSide.home[key] + perSide.away[key];
  const passes = totals.home.passes + totals.away.passes;
  const completed = totals.home.completedPasses + totals.away.completedPasses;
  return {
    matches,
    goalsPerMatch: both("goals"),
    shotsPerMatch: both("shots"),
    xgPerMatch: both("xg"),
    passesPerMatch: both("passes"),
    passCompletion: passes === 0 ? 0 : completed / passes,
    cornersPerMatch: both("corners"),
    foulsPerMatch: both("fouls"),
    throwInsPerMatch: both("throwIns"),
    goalKicksPerMatch: both("goalKicks"),
    penaltiesPerMatch: both("penalties"),
    actionsPerMatch: both("actions"),
    homeWinRate: homeWins / matches,
    drawRate: draws / matches,
    awayWinRate: (matches - homeWins - draws) / matches,
    perSide,
  };
};

const percent = (rate: number): string => `${(rate * 100).toFixed(1)}%`;

type Row = [label: string, total: string, home: string, away: string];

const rowsOf = (s: ActionBalanceSummary): Row[] => {
  const n = (key: keyof ActionSideAverages, digits = 1): Row[1 | 2 | 3][] => [
    (s.perSide.home[key] + s.perSide.away[key]).toFixed(digits),
    s.perSide.home[key].toFixed(digits),
    s.perSide.away[key].toFixed(digits),
  ];
  const row = (label: string, key: keyof ActionSideAverages, digits = 1): Row => {
    const [total, home, away] = n(key, digits) as [string, string, string];
    return [label, total, home, away];
  };
  return [
    row("Goals", "goals", 2),
    row("Shots", "shots"),
    row("Shots on target", "shotsOnTarget"),
    row("xG", "xg", 2),
    row("Passes", "passes", 0),
    row("Completed passes", "completedPasses", 0),
    [
      "Pass completion",
      percent(s.passCompletion),
      percent(s.perSide.home.passCompletion),
      percent(s.perSide.away.passCompletion),
    ],
    row("Corners", "corners"),
    row("Fouls", "fouls"),
    row("Throw-ins", "throwIns"),
    row("Goal kicks", "goalKicks"),
    row("Penalties", "penalties", 2),
    row("High turnovers", "highTurnovers"),
    row("Shots conceded on counters", "countersConceded", 2),
    row("Crosses", "crosses"),
    row("Central shots", "centralShots"),
    row("Actions", "actions", 0),
  ];
};

/** A markdown table of the summary, ready to paste into a PR description. */
export const formatBalanceTable = (title: string, summary: ActionBalanceSummary): string =>
  [
    `**${title}** (${summary.matches} matches)`,
    "",
    "| Metric | Per match | Home | Away |",
    "|---|---|---|---|",
    ...rowsOf(summary).map(
      ([label, total, home, away]) => `| ${label} | ${total} | ${home} | ${away} |`,
    ),
    `| Home / draw / away | ${percent(summary.homeWinRate)} / ${percent(summary.drawRate)} / ${percent(summary.awayWinRate)} | | |`,
  ].join("\n");
