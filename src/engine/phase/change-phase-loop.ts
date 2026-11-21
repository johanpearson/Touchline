import type { ActionMatchChange } from "../action/action-match";
import { applyChangeToInput } from "../action/apply-change-to-input";
import type { LoopChange } from "../action/change-loop";
import { drainEnergyTo, withInput } from "../action/energy-state";
import type { PhaseLoopState } from "./phase-loop-state";

/** What applying a change did, as for the action engine: the answer, the state after it and whether it is recorded. */
export type PhaseLoopChange = Omit<LoopChange, "state"> & { readonly state: PhaseLoopState };

/**
 * Applies new starters and/or tactics to one side from the next step. Consumes no randomness. After
 * full time the change is accepted and ignored; an invalid lineup is returned as an error and leaves
 * the match as it was. Throws a `RangeError` for a side that is not `home` or `away`.
 */
export const changePhaseLoop = (
  state: PhaseLoopState,
  change: ActionMatchChange,
): PhaseLoopChange => {
  if (change.side !== "home" && change.side !== "away") {
    throw new RangeError(`Invalid side: ${String(change.side)}`);
  }
  if (state.period === "fullTime") return { result: { ok: true }, state, recorded: false };
  const applied = applyChangeToInput(state.input, change);
  if (!applied.ok) return { result: applied, state, recorded: false };
  const drained = drainEnergyTo(state.energy, state.input, state.time);
  return {
    result: { ok: true },
    state: { ...state, input: applied.input, energy: withInput(drained, applied.input) },
    recorded: true,
  };
};
