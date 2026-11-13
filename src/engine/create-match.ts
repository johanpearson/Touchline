import type { MatchEvent } from "./match-event";
import type { MatchInput } from "./match-input";
import type { MatchState, Side } from "./match-state";
import { createRng } from "./rng";
import { resolveTransition } from "./transition";

/** A running match simulation. */
export type Match = {
  /** The ordered log of everything that has happened so far. */
  readonly events: readonly MatchEvent[];
  /** The state after the last `advanceTo` call. */
  readonly state: MatchState;
  /** Simulates up to `seconds` of match time. Going back in time is ignored. */
  advanceTo: (seconds: number) => void;
};

const MIN_STEP_SECONDS = 5;
const STEP_SPREAD_SECONDS = 12;

/**
 * Creates a deterministic match. The same `input` and `seed` always give the same event log,
 * however the time is split across `advanceTo` calls.
 */
export const createMatch = (input: MatchInput, seed: number): Match => {
  const rng = createRng(seed);
  const firstPossession: Side = rng.chance(0.5) ? "home" : "away";
  const centre = { x: 0.5, y: 0.5 };
  let state: MatchState = {
    time: 0,
    period: "firstHalf",
    possession: firstPossession,
    ball: centre,
    danger: 0,
    score: { home: 0, away: 0 },
  };
  const events: MatchEvent[] = [
    { type: "kickoff", time: 0, team: firstPossession, position: centre, intensity: 0.3 },
  ];
  const nextStepDelay = () => MIN_STEP_SECONDS + rng.next() * STEP_SPREAD_SECONDS;
  let nextStepAt = nextStepDelay();

  const advanceTo = (seconds: number): void => {
    if (!Number.isFinite(seconds)) throw new RangeError(`Invalid match time: ${seconds}`);
    while (nextStepAt <= seconds) {
      const transition = resolveTransition({ ...state, time: nextStepAt }, input, rng);
      state = transition.state;
      events.push(...transition.events);
      nextStepAt += nextStepDelay();
    }
    state = { ...state, time: Math.max(state.time, seconds) };
  };

  return {
    get events() {
      return events;
    },
    get state() {
      return state;
    },
    advanceTo,
  };
};
