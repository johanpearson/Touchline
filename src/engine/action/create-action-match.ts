import type { Side } from "../match-state";
import type { ActionMatch, ActionMatchOptions, TimedActionMatchChange } from "./action-match";
import { advanceLoop } from "./advance-loop";
import { changeLoop } from "./change-loop";
import { matchStateOf } from "./loop-state";
import type { MatchInput } from "./match-input";
import { resumeLoop } from "./resume-loop";
import { startLoop } from "./start-loop";

const penaltySides = (option: boolean | Side): Record<Side, boolean> =>
  typeof option === "boolean"
    ? { home: option, away: option }
    : { home: option === "home", away: option === "away" };

/**
 * Creates a deterministic action-engine match. Simulation draws from `fork("action-sim")`, snapshot
 * jitter from `fork("action-presentation")` and added time from its own `fork("addedTime")`, so no
 * stream depends on another. The same input and seed give the same log however time is split across
 * `advanceTo` calls.
 *
 * `applyChange` swaps a side's starters and/or tactics from the next action; it consumes no
 * randomness, so changes applied at the same moments are part of the reproducible input.
 *
 * The match loop is a set of small steps (`startLoop`, `advanceLoop`, `resumeLoop`, `changeLoop`)
 * that take the loop state and return the next one; this function only holds the current state.
 */
export const createActionMatch = (
  initialInput: MatchInput,
  seed: number,
  options: ActionMatchOptions = {},
): ActionMatch => {
  const {
    state: first,
    context,
    firstKickoff,
    secondHalfAdded,
  } = startLoop(
    initialInput,
    seed,
    (options.detail ?? "full") === "full",
    penaltySides(options.energyPenalty ?? true),
  );
  let state = first;
  const changes: TimedActionMatchChange[] = [];

  return {
    get events() {
      return context.events;
    },
    get state() {
      return matchStateOf(state);
    },
    get changes() {
      return changes;
    },
    advanceTo: (seconds) => {
      state = advanceLoop(state, seconds, context);
    },
    applyChange: (change) => {
      const changed = changeLoop(state, change);
      state = changed.state;
      if (changed.recorded) changes.push({ time: state.time, change });
      return changed.result;
    },
    resume: () => {
      state = resumeLoop(state, firstKickoff, secondHalfAdded, context);
    },
  };
};
