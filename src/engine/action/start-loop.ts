import type { Side } from "../match-state";
import { createRng } from "../rng";
import { actInLoop } from "./act-in-loop";
import {
  FIRST_HALF_ADDED_MINUTES,
  HALF_SECONDS,
  SECOND_HALF_ADDED_MINUTES,
  SECONDS_PER_MINUTE,
} from "./loop-constants";
import type { LoopContext, LoopState } from "./loop-state";
import type { MatchInput } from "./match-input";
import { kickoffPlay } from "./play-action";

/** A match as it stands after the kickoff action: its state, its log and what the second half needs later. */
export type StartedLoop = {
  readonly state: LoopState;
  readonly context: LoopContext;
  /** The side that kicked off the match; the other side kicks off the second half. */
  readonly firstKickoff: Side;
  /** Seconds of added time of the second half, drawn up front so no later step changes the stream. */
  readonly secondHalfAdded: number;
};

/**
 * Starts a match: forks the three random streams (simulation, snapshot jitter, added time) from the
 * seed, draws who kicks off and the added time of both halves, and plays the first action at time 0.
 * Forking does not consume the parent stream, so no stream depends on another. `withSnapshots` false
 * is the fast path: no snapshots and no presentation stream.
 */
export const startLoop = (input: MatchInput, seed: number, withSnapshots: boolean): StartedLoop => {
  const root = createRng(seed);
  const sim = root.fork("action-sim");
  const presentation = withSnapshots ? root.fork("action-presentation") : undefined;
  const addedTimeRng = root.fork("addedTime");
  const addedSeconds = (range: { min: number; max: number }) =>
    addedTimeRng.int(range.min, range.max) * SECONDS_PER_MINUTE;

  const firstKickoff: Side = sim.chance(0.5) ? "home" : "away";
  const firstHalfEnd = HALF_SECONDS + addedSeconds(FIRST_HALF_ADDED_MINUTES);
  const secondHalfAdded = addedSeconds(SECOND_HALF_ADDED_MINUTES);
  const context: LoopContext = { events: [], sim, presentation };
  const initial: LoopState = {
    input,
    period: "firstHalf",
    time: 0,
    periodEnd: firstHalfEnd,
    play: kickoffPlay(firstKickoff, { home: 0, away: 0 }, { home: 0, away: 0 }),
    nextActionAt: 0,
  };
  return { state: actInLoop(initial, 0, context), context, firstKickoff, secondHalfAdded };
};
