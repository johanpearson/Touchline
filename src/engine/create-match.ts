import type { ActionMatchOptions } from "./action/action-match";
import { createActionMatch } from "./action/create-action-match";
import type { MatchInput } from "./action/match-input";
import { createPhaseMatch, type PhaseMatch } from "./phase/create-phase-match";

/** A running match on either engine: `steps` is empty on the action engine (version 2). */
export type Match = PhaseMatch;

/**
 * Creates a match on the engine the input names: `engineVersion` 3 is the phase-step engine
 * (`createPhaseMatch`), 2 the action engine (`createActionMatch`, unchanged). The two share one API.
 */
export const createMatch = (
  input: MatchInput,
  seed: number,
  options: ActionMatchOptions = {},
): Match =>
  input.engineVersion === 3
    ? createPhaseMatch(input, seed, options)
    : Object.assign(createActionMatch(input, seed, options), { steps: [] });
