import { limitEventSnapshot } from "./limit-event-snapshot";
import type { LoopContext, LoopState } from "./loop-state";
import { playAction } from "./play-action";

const round1 = (value: number): number => Math.round(value * 10) / 10;

/**
 * Plays one action at time `at`: appends its events to the log (an action may replace the last event
 * first), and returns the state with the new play and the time of the next action, rounded to a tenth.
 */
export const actInLoop = (state: LoopState, at: number, context: LoopContext): LoopState => {
  const { events } = context;
  const result = playAction({
    input: state.input,
    play: state.play,
    time: at,
    period: state.period,
    sim: context.sim,
    presentation: context.presentation,
    previous: events.at(-1),
  });
  if (result.replacedPrevious !== undefined) events[events.length - 1] = result.replacedPrevious;
  for (const event of result.events)
    events.push(limitEventSnapshot(event, events.at(-1), state.input));
  return { ...state, play: result.play, nextActionAt: round1(at + result.duration) };
};
