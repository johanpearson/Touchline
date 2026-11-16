import { aMatchInput } from "./action-builders";
import type { LoopContext, LoopState } from "./loop-state";
import { type StartedLoop, startLoop } from "./start-loop";

/** A match started on two average teams, for tests of the loop steps. */
export const aStartedLoop = (seed = 7, withSnapshots = true): StartedLoop =>
  startLoop(aMatchInput().build(), seed, withSnapshots);

/** A started match played to half-time. The log is shared with the returned context. */
export const aLoopAtHalfTime = (
  seed: number,
  advance: (state: LoopState, seconds: number, context: LoopContext) => LoopState,
): StartedLoop & { halfTime: LoopState } => {
  const started = aStartedLoop(seed);
  return { ...started, halfTime: advance(started.state, 1_000_000, started.context) };
};
