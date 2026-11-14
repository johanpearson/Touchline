import { createMatch } from "./create-match";
import type { MatchEvent } from "./match-event";
import type { MatchInput } from "./match-input";
import type { Side } from "./match-state";
import { computeMatchStats, type PerSide } from "./match-stats";
import { progressOf } from "./pitch";

/** Per-match averages for one side. */
export type SideAverages = {
  goals: number;
  shots: number;
  corners: number;
  /** Sideways moves in build-up. */
  lateralMoves: number;
  /** Turnovers won in the opponent's half. */
  highTurnovers: number;
};

/** Averages and rates over many simulated matches. Win rates are from the home side's view. */
export type BalanceSummary = {
  matches: number;
  goalsPerMatch: number;
  shotsPerMatch: number;
  xgPerMatch: number;
  homeWinRate: number;
  drawRate: number;
  awayWinRate: number;
  perSide: PerSide<SideAverages>;
};

/** Far beyond any match length; `advanceTo` stops at half-time and full time by itself. */
const PLAY_ON = 1_000_000;

const playFullMatch = (input: MatchInput, seed: number) => {
  const match = createMatch(input, seed);
  match.advanceTo(PLAY_ON);
  match.resume();
  match.advanceTo(PLAY_ON);
  return match;
};

const averaged = (totals: SideAverages, matches: number): SideAverages => ({
  goals: totals.goals / matches,
  shots: totals.shots / matches,
  corners: totals.corners / matches,
  lateralMoves: totals.lateralMoves / matches,
  highTurnovers: totals.highTurnovers / matches,
});

const SIDES: Side[] = ["home", "away"];

const countFor = (events: readonly MatchEvent[], side: Side, type: MatchEvent["type"]) =>
  events.filter((e) => e.type === type && e.team === side).length;

const highTurnoversFor = (events: readonly MatchEvent[], side: Side) =>
  events.filter(
    (e) => e.type === "turnover" && e.team === side && progressOf(side, e.position.x) > 0.5,
  ).length;

/**
 * Simulates `matches` matches with seeds `baseSeed`, `baseSeed + 1`, ... and summarises them.
 * Deterministic: the same arguments always give the same summary.
 */
export const simulateBalance = (
  input: MatchInput,
  matches: number,
  baseSeed: number,
): BalanceSummary => {
  if (!Number.isInteger(matches) || matches < 1) {
    throw new RangeError(`Match count must be a positive integer: ${matches}`);
  }
  let goals = 0;
  let shots = 0;
  let xg = 0;
  let homeWins = 0;
  let draws = 0;
  const totals: PerSide<SideAverages> = {
    home: { goals: 0, shots: 0, corners: 0, lateralMoves: 0, highTurnovers: 0 },
    away: { goals: 0, shots: 0, corners: 0, lateralMoves: 0, highTurnovers: 0 },
  };
  for (let i = 0; i < matches; i++) {
    const match = playFullMatch(input, baseSeed + i);
    const { home, away } = match.state.score;
    const stats = computeMatchStats(match.events, PLAY_ON);
    goals += home + away;
    shots += stats.shots.home + stats.shots.away;
    xg += stats.xg.home + stats.xg.away;
    for (const side of SIDES) {
      totals[side].goals += match.state.score[side];
      totals[side].shots += stats.shots[side];
      totals[side].corners += stats.corners[side];
      totals[side].lateralMoves += countFor(match.events, side, "lateral");
      totals[side].highTurnovers += highTurnoversFor(match.events, side);
    }
    if (home > away) homeWins += 1;
    else if (home === away) draws += 1;
  }
  return {
    matches,
    goalsPerMatch: goals / matches,
    shotsPerMatch: shots / matches,
    xgPerMatch: xg / matches,
    homeWinRate: homeWins / matches,
    drawRate: draws / matches,
    awayWinRate: (matches - homeWins - draws) / matches,
    perSide: { home: averaged(totals.home, matches), away: averaged(totals.away, matches) },
  };
};

const percent = (rate: number): string => `${(rate * 100).toFixed(1)}%`;

/** A markdown table of the summary, ready to paste into a PR description. */
export const formatBalanceTable = (title: string, summary: BalanceSummary): string =>
  [
    `**${title}**`,
    "",
    "| Metric | Value |",
    "|---|---|",
    `| Matches | ${summary.matches} |`,
    `| Goals per match | ${summary.goalsPerMatch.toFixed(2)} |`,
    `| Shots per match | ${summary.shotsPerMatch.toFixed(1)} |`,
    `| xG per match | ${summary.xgPerMatch.toFixed(2)} |`,
    `| Home win rate | ${percent(summary.homeWinRate)} |`,
    `| Draw rate | ${percent(summary.drawRate)} |`,
    `| Away win rate | ${percent(summary.awayWinRate)} |`,
  ].join("\n");
