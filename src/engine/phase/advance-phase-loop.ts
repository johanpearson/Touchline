import { drainEnergyTo } from "../action/energy-state";
import { isPlaying } from "../action/loop-state";
import type { PhaseLoopContext, PhaseLoopState } from "./phase-loop-state";
import { playStep } from "./play-step";

/** Draws every step that starts at or before `seconds`. */
const playDueSteps = (
  state: PhaseLoopState,
  seconds: number,
  context: PhaseLoopContext,
): PhaseLoopState => {
  let current = state;
  while (current.next !== undefined && current.next.time <= seconds) {
    current = playStep(current, context);
  }
  return current;
};

/** Half-time or full time once the period's last step is drawn and the time has reached its end. */
const endedPeriod = (state: PhaseLoopState, seconds: number): PhaseLoopState => {
  if (state.next !== undefined || seconds < state.periodEnd) return state;
  return { ...state, period: state.period === "firstHalf" ? "halfTime" : "fullTime" };
};

/**
 * Simulates up to `seconds` of match time: every step that starts at or before it is drawn whole
 * (its actions are in the log from its start), then the period ends (half-time or full time) once
 * its last step is drawn and the time reaches its end. Does nothing outside a playing period and
 * never goes back in time. Throws a `RangeError` for a time that is not a finite number. Which steps
 * are drawn depends only on `seconds`, so any split of the time gives the same steps.
 */
export const advancePhaseLoop = (
  state: PhaseLoopState,
  seconds: number,
  context: PhaseLoopContext,
): PhaseLoopState => {
  if (!Number.isFinite(seconds)) throw new RangeError(`Invalid match time: ${seconds}`);
  if (!isPlaying(state.period)) return state;
  const current = playDueSteps(state, seconds, context);
  const target = Math.min(seconds, current.periodEnd);
  return endedPeriod(
    {
      ...current,
      time: Math.max(current.time, target),
      energy: drainEnergyTo(current.energy, current.input, target),
    },
    seconds,
  );
};
