import { actInLoop } from "./act-in-loop";
import { changePeriod } from "./change-period";
import { isPlaying, type LoopContext, type LoopState } from "./loop-state";

/**
 * Whether the next action falls inside the time being simulated: before `target`, or exactly at it
 * while the period is not over (an action at the very end of a period belongs to the next one).
 */
export const actionIsDue = (nextActionAt: number, target: number, periodEnd: number): boolean =>
  nextActionAt < target || (nextActionAt === target && target < periodEnd);

/**
 * Simulates up to `seconds` of match time, or to the end of the period if that comes first, and ends
 * the period (half-time or full time) when it is reached. Does nothing outside a playing period and
 * never goes back in time. Throws a `RangeError` for a time that is not a finite number.
 */
export const advanceLoop = (state: LoopState, seconds: number, context: LoopContext): LoopState => {
  if (!Number.isFinite(seconds)) throw new RangeError(`Invalid match time: ${seconds}`);
  if (!isPlaying(state.period)) return state;
  const target = Math.min(seconds, state.periodEnd);
  let current = state;
  while (actionIsDue(current.nextActionAt, target, current.periodEnd)) {
    current = actInLoop(current, current.nextActionAt, context);
  }
  current = { ...current, time: Math.max(current.time, target) };
  if (target !== current.periodEnd) return current;
  return changePeriod(
    current,
    current.periodEnd,
    current.period === "firstHalf" ? "halfTime" : "fullTime",
    context,
  );
};
