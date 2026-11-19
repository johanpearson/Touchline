import type { ActionMatchChange } from "./action-match";
import { applyChangeToInput } from "./apply-change-to-input";
import { drainEnergyTo, withInput } from "./energy-state";
import type { LoopState } from "./loop-state";
import type { MatchInputValidation } from "./validate-match-input";

/** What applying a change did: the answer for the caller, the state after it, and whether it is part of the match. */
export type LoopChange = {
  readonly result: MatchInputValidation;
  readonly state: LoopState;
  /** True when the change was applied and is to be listed in the match's changes. */
  readonly recorded: boolean;
};

/**
 * Applies new starters and/or tactics to one side from the next action. Consumes no randomness. After
 * full time the change is accepted and ignored; an invalid lineup is returned as an error and leaves
 * the match as it was. Throws a `RangeError` for a side that is not `home` or `away`.
 */
export const changeLoop = (state: LoopState, change: ActionMatchChange): LoopChange => {
  if (change.side !== "home" && change.side !== "away") {
    throw new RangeError(`Invalid side: ${String(change.side)}`);
  }
  if (state.period === "fullTime") return { result: { ok: true }, state, recorded: false };
  const applied = applyChangeToInput(state.input, change);
  if (!applied.ok) return { result: applied, state, recorded: false };
  const drained = drainEnergyTo(state.energy, state.input, state.time);
  const energy = withInput(drained, applied.input);
  return {
    result: { ok: true },
    state: { ...state, input: applied.input, energy },
    recorded: true,
  };
};
