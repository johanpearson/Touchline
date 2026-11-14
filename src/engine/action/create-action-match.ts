import type { ActionMatch, ActionMatchState, TimedActionMatchChange } from "./action-match";
import type { MatchInputV2 } from "./match-input-v2";
import { PITCH_LENGTH, PITCH_WIDTH } from "./pitch-metres";

/**
 * Documented stub: the action engine has no simulation yet, so the match stays at kickoff with an
 * empty log however far it is advanced. The simulation arrives in later issues of the epic.
 */
export const createActionMatch = (_input: MatchInputV2, _seed: number): ActionMatch => {
  const changes: TimedActionMatchChange[] = [];
  const state: ActionMatchState = {
    time: 0,
    period: "firstHalf",
    possession: "home",
    ball: { x: PITCH_LENGTH / 2, y: PITCH_WIDTH / 2 },
    score: { home: 0, away: 0 },
  };
  return {
    events: [],
    state,
    changes,
    advanceTo: (seconds) => {
      if (!Number.isFinite(seconds)) throw new RangeError(`Invalid match time: ${seconds}`);
    },
    applyChange: (change) => {
      changes.push({ time: state.time, change });
    },
    resume: () => {
      throw new Error(`Cannot resume from ${state.period}`);
    },
  };
};
