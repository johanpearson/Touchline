import type { ActionEvent } from "../action/action-event";
import type { ActionMatchState, MatchDetail } from "../action/action-match";
import { type EnergyState, energyOf } from "../action/energy-state";
import type { MatchInput } from "../action/match-input";
import type { Point } from "../action/pitch-metres";
import type { Period, Side } from "../match-state";
import type { Rng } from "../rng";
import type { PhaseState } from "./phase-state";
import type { PhaseStep } from "./phase-step";

/**
 * Everything the phase match loop changes from one step to the next. A step returns a new state; the
 * steps, the event log and the random stream live in `PhaseLoopContext`, which a match owns.
 */
export type PhaseLoopState = {
  /** The input as changed so far by substitutions and tactics. */
  readonly input: MatchInput;
  readonly period: Period;
  /** Match time in seconds reached by the last `advanceTo`. */
  readonly time: number;
  /** When the current period ends: the nominal end, then the end of the step that whistled. */
  readonly periodEnd: number;
  /** The possession the next step is drawn from; `undefined` once the period's last step is drawn. */
  readonly next: PhaseState | undefined;
  readonly energy: EnergyState;
  readonly score: Readonly<Record<Side, number>>;
  readonly fouls: Readonly<Record<Side, number>>;
  readonly possession: Side;
  readonly ball: Point;
};

/** The parts of a match that are appended to or drawn from, not copied on every step. */
export type PhaseLoopContext = {
  readonly steps: PhaseStep[];
  readonly events: ActionEvent[];
  readonly sim: Rng;
  readonly seed: number;
  readonly detail: MatchDetail;
  /** The side that kicked off the match; the other side kicks off the second half. */
  readonly firstKickoff: Side;
  /** Seconds of added time of the second half, drawn up front so no later step changes the stream. */
  readonly secondHalfAdded: number;
};

/** The public state of a match: copies, so a caller cannot change the loop through it. */
export const phaseMatchStateOf = (state: PhaseLoopState): ActionMatchState => ({
  time: state.time,
  period: state.period,
  possession: state.possession,
  ball: state.ball,
  score: { ...state.score },
  fouls: { ...state.fouls },
  energy: energyOf(state.energy, state.input),
});
