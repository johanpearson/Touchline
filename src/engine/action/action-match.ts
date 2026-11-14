import type { Period, Side } from "../match-state";
import type { TeamTactics } from "../tactics";
import type { ActionEvent } from "./action-event";
import type { EnginePlayer } from "./engine-player";
import type { Point } from "./pitch-metres";

/** The state of an action match after the last `advanceTo` call. */
export type ActionMatchState = {
  /** Match time in seconds, including added time. */
  time: number;
  period: Period;
  possession: Side;
  /** Ball position in metres. */
  ball: Point;
  score: Record<Side, number>;
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
  /** Consumes no randomness; ignored after full time. */
  applyChange: (change: ActionMatchChange) => void;
  readonly changes: readonly TimedActionMatchChange[];
  /** Starts the second half after half-time. */
  resume: () => void;
};
