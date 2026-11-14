import type { Period, Side } from "../match-state";
import type { TeamTactics } from "../tactics";
import type { ActionEvent } from "./action-event";
import type { EnginePlayer } from "./engine-player";
import type { Point } from "./pitch-metres";
import type { MatchInputValidation } from "./validate-match-input-v2";

/** The state of an action match after the last `advanceTo` call. */
export type ActionMatchState = {
  /** Match time in seconds, including added time. */
  time: number;
  period: Period;
  possession: Side;
  /** Ball position in metres. */
  ball: Point;
  score: Record<Side, number>;
  /** Fouls committed by each side so far. */
  fouls: Record<Side, number>;
};

/** New starters (a substitution) and/or new tactics for one side, applied from the next action. */
export type ActionMatchChange = {
  side: Side;
  lineup?: readonly EnginePlayer[];
  tactics?: TeamTactics;
};

export type TimedActionMatchChange = {
  time: number;
  change: ActionMatchChange;
};

/** A running action-engine simulation. Same control methods as the zone engine's `Match`. */
export type ActionMatch = {
  readonly events: readonly ActionEvent[];
  readonly state: ActionMatchState;
  /** Simulates up to `seconds` of match time; stops at half-time and full time. */
  advanceTo: (seconds: number) => void;
  /**
   * Applies new starters and/or tactics to one side from the next action. Consumes no randomness
   * and is ignored after full time (`{ ok: true }`, nothing recorded).
   *
   * Expected errors come back as `{ ok: false, errors }` and leave the match untouched: a lineup
   * that is not 11 players with one goalkeeper and the side's formation lines, has an attribute
   * out of range, or reuses a player id (within the lineup or from the other side).
   * Throws `RangeError` for programmer errors: a `side` that is not "home" or "away".
   * The substituted-in players are removed from the bench.
   */
  applyChange: (change: ActionMatchChange) => MatchInputValidation;
  readonly changes: readonly TimedActionMatchChange[];
  /** Starts the second half after half-time. */
  resume: () => void;
};
