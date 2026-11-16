import type { Period } from "../match-state";
import type { Rng } from "../rng";
import type { ActionEvent } from "./action-event";
import type { ActionMatchState } from "./action-match";
import type { MatchInput } from "./match-input";
import type { PlayState } from "./play-state";

/**
 * Everything the match loop changes from one step to the next. A step returns a new state; the event
 * log and the random streams live in `LoopContext`, which a match owns for its whole life.
 */
export type LoopState = {
  /** The input as changed so far by substitutions and tactics. */
  readonly input: MatchInput;
  readonly period: Period;
  /** Match time in seconds reached by the last `advanceTo`. */
  readonly time: number;
  /** When the current period ends, added time included. */
  readonly periodEnd: number;
  readonly play: PlayState;
  /** The time of the next action. */
  readonly nextActionAt: number;
};

/** The parts of a match that are appended to or drawn from, not copied on every step. */
export type LoopContext = {
  /** The event log. Steps append to it (and replace its last event when an action asks for that). */
  readonly events: ActionEvent[];
  readonly sim: Rng;
  /** Absent on the fast path, which builds no snapshots. */
  readonly presentation: Rng | undefined;
};

/** Time only runs in the two playing periods. */
export const isPlaying = (period: Period): boolean =>
  period === "firstHalf" || period === "secondHalf";

/** The public state of a match: copies, so a caller cannot change the loop through it. */
export const matchStateOf = (state: LoopState): ActionMatchState => ({
  time: state.time,
  period: state.period,
  possession: state.play.possession,
  ball: state.play.ball,
  score: { ...state.play.score },
  fouls: { ...state.play.fouls },
});
