import { drainEnergyTo } from "../action/energy-state";
import { isPlaying } from "../action/loop-state";
import type { PhaseLoopContext, PhaseLoopState } from "./phase-loop-state";
import { playStep } from "./play-step";

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
  let current = state;
  while (current.next !== undefined && current.next.time <= seconds) {
    current = playStep(current, context);
  }
  const target = Math.min(seconds, current.periodEnd);
  const advanced = {
    ...current,
    time: Math.max(current.time, target),
    energy: drainEnergyTo(current.energy, current.input, target),
  };
  if (advanced.next !== undefined || seconds < advanced.periodEnd) return advanced;
  return { ...advanced, period: advanced.period === "firstHalf" ? "halfTime" : "fullTime" };
};
