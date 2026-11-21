import type {
  ActionMatch,
  ActionMatchOptions,
  TimedActionMatchChange,
} from "../action/action-match";
import { penaltySides } from "../action/energy-state";
import type { MatchInput } from "../action/match-input";
import { advancePhaseLoop } from "./advance-phase-loop";
import { changePhaseLoop } from "./change-phase-loop";
import { phaseMatchStateOf } from "./phase-loop-state";
import type { PhaseStep } from "./phase-step";
import { resumePhaseLoop } from "./resume-phase-loop";
import { startPhaseLoop } from "./start-phase-loop";

/** A running phase-step simulation: the action-match controls plus the steps behind the derived log. */
export type PhaseMatch = ActionMatch & { readonly steps: readonly PhaseStep[] };

/**
 * Creates a deterministic engine v3 match. Steps are drawn from `fork("phase-sim")`, added time from
 * `fork("addedTime")` and the derived actions from `fork("inner-actions")`, so no stream depends on
 * another. The same input, seed and changes give the same steps however time is split across
 * `advanceTo` calls. `events` is the derived action log (`toActionEvents`), so stats, ratings and
 * views keep working; `detail: "fast"` leaves out the snapshots and gives the same steps and events.
 *
 * `applyChange` swaps a side's starters and/or tactics from the next step; it consumes no randomness.
 */
export const createPhaseMatch = (
  initialInput: MatchInput,
  seed: number,
  options: ActionMatchOptions = {},
): PhaseMatch => {
  const { state: first, context } = startPhaseLoop(
    initialInput,
    seed,
    options.detail ?? "full",
    penaltySides(options.energyPenalty ?? true),
  );
  let state = first;
  const changes: TimedActionMatchChange[] = [];

  return {
    get events() {
      return context.events;
    },
    get steps() {
      return context.steps;
    },
    get state() {
      return phaseMatchStateOf(state);
    },
    get changes() {
      return changes;
    },
    advanceTo: (seconds) => {
      state = advancePhaseLoop(state, seconds, context);
    },
    applyChange: (change) => {
      const changed = changePhaseLoop(state, change);
      state = changed.state;
      if (changed.recorded) changes.push({ time: state.time, change });
      return changed.result;
    },
    resume: () => {
      state = resumePhaseLoop(state, context);
    },
  };
};
