import type { Period } from "../match-state";
import type { LoopContext, LoopState } from "./loop-state";
import { periodSnapshot } from "./play-action";

/**
 * Moves the match into `period` at time `at`: appends the `periodChange` event (with the ball where
 * it lies and the snapshot of that moment) and returns the state in the new period.
 */
export const changePeriod = (
  state: LoopState,
  at: number,
  period: Period,
  context: LoopContext,
): LoopState => {
  context.events.push({
    type: "periodChange",
    time: at,
    period,
    team: state.play.possession,
    from: state.play.ball,
    to: state.play.ball,
    pressure: 0,
    snapshot: periodSnapshot({
      input: state.input,
      play: state.play,
      presentation: context.presentation,
    }),
  });
  return { ...state, period };
};
