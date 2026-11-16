import type { Side } from "../match-state";
import type { PerSide } from "../per-side";
import type { ActionEvent } from "./action-event";
import { computeActionStats } from "./action-stats";
import { CENTRAL_SHOT_CHANNEL } from "./decision-constants";
import { PITCH_LENGTH, PITCH_WIDTH } from "./pitch-metres";

/** Seconds after a turnover within which a shot counts as a counter. */
export const COUNTER_WINDOW_SECONDS = 20;

/** Counts of one match, per side. Penalties are those awarded to the side; fouls those it committed. */
export type MatchMetrics = {
  shots: PerSide<number>;
  shotsOnTarget: PerSide<number>;
  xg: PerSide<number>;
  passes: PerSide<number>;
  completedPasses: PerSide<number>;
  corners: PerSide<number>;
  fouls: PerSide<number>;
  throwIns: PerSide<number>;
  goalKicks: PerSide<number>;
  penalties: PerSide<number>;
  /** Turnovers won in the opponent's half. */
  highTurnovers: PerSide<number>;
  /** Shots conceded within `COUNTER_WINDOW_SECONDS` of the opponent winning the ball. */
  countersConceded: PerSide<number>;
  crosses: PerSide<number>;
  /** Shots from within the central channel. */
  centralShots: PerSide<number>;
  /** Player actions (everything but period changes). */
  actions: PerSide<number>;
};

const zero = (): PerSide<number> => ({ home: 0, away: 0 });
const other = (side: Side): Side => (side === "home" ? "away" : "home");

/** The side that wins the ball in open play with `event`, if it does. */
const turnoverWinner = (event: ActionEvent): Side | undefined => {
  if (event.type === "pass" && event.outcome === "intercepted") return other(event.team);
  if (event.type === "carry" && event.outcome === "tackled") return other(event.team);
  if (event.type === "tackle" && event.outcome === "won") return event.team;
  if (event.type === "interception") return event.team;
  return undefined;
};

const inOpponentHalf = (side: Side, x: number): boolean =>
  side === "home" ? x > PITCH_LENGTH / 2 : x < PITCH_LENGTH / 2;

/** Counts for one match from its log (a fast log is enough). */
export const matchMetrics = (events: readonly ActionEvent[]): MatchMetrics => {
  const { teams } = computeActionStats(events, events.at(-1)?.time ?? 0);
  const penalties = zero();
  const highTurnovers = zero();
  const countersConceded = zero();
  const crosses = zero();
  const centralShots = zero();
  const actions = zero();
  const lastTurnover: Record<Side, number> = { home: -Infinity, away: -Infinity };
  for (const event of events) {
    if (event.type !== "periodChange") actions[event.team] += 1;
    if (event.type === "foul" && event.outcome === "penalty") penalties[event.team] += 1;
    if (event.type === "pass" && event.variant === "cross") crosses[event.team] += 1;
    if (event.type === "shot") {
      if (Math.abs(event.from.y - PITCH_WIDTH / 2) <= CENTRAL_SHOT_CHANNEL) {
        centralShots[event.team] += 1;
      }
      if (event.time - lastTurnover[event.team] <= COUNTER_WINDOW_SECONDS) {
        countersConceded[other(event.team)] += 1;
      }
    }
    const winner = turnoverWinner(event);
    if (winner) {
      lastTurnover[winner] = event.time;
      if (inOpponentHalf(winner, event.to.x)) highTurnovers[winner] += 1;
    }
  }
  return {
    shots: teams.shots,
    shotsOnTarget: teams.shotsOnTarget,
    xg: teams.xg,
    passes: teams.passes,
    completedPasses: teams.completedPasses,
    corners: teams.corners,
    fouls: teams.fouls,
    throwIns: teams.throwIns,
    goalKicks: teams.goalKicks,
    penalties,
    highTurnovers,
    countersConceded,
    crosses,
    centralShots,
    actions,
  };
};
