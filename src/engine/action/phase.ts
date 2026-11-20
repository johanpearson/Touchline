import type { Period, Side } from "../match-state";
import type { Point } from "./pitch-metres";

export type PhaseOutcome =
  | "goal"
  | "shot"
  | "turnover"
  | "foul"
  | "outOfPlay"
  | "setPiece"
  | "periodEnd";

/** One side's uninterrupted control of the ball: a passage of play with one outcome. */
export type Phase = {
  /** The side that had the ball at the phase's first action. */
  team: Side;
  period: Period;
  startTime: number;
  endTime: number;
  /** Indices into the action log, ascending and contiguous. */
  actions: readonly number[];
  outcome: PhaseOutcome;
  /** The highest xG of a shot in the phase; without a shot, a small value (at most `APPROACH_DANGER`) for how near the ball came to goal. */
  danger: number;
  /** Metres gained towards the goal the side attacks, from the first action's start to the last action's end. */
  territory: number;
  passes: number;
  /** Where the ball went: the first action's start, then the end of every action. */
  path: readonly Point[];
};

/** A phase without a shot shorter than this many actions is merged into its neighbour. */
export const MIN_PHASE_ACTIONS = 3;
/** The danger of a shot-less phase that reached the opponent's goal line. */
export const APPROACH_DANGER = 0.05;

/** A phase while it is being grouped: the log positions it holds, before its fields are computed. */
export type RawPhase = {
  team: Side;
  period: Period;
  indices: number[];
  outcome: PhaseOutcome;
};
