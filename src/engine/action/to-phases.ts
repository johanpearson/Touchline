import type { ActionEvent } from "./action-event";
import { buildPhase } from "./build-phase";
import { groupActions } from "./group-phases";
import { mergeShort } from "./merge-phases";
import type { Phase } from "./phase";

export type { Phase, PhaseOutcome } from "./phase";
export { APPROACH_DANGER, MIN_PHASE_ACTIONS } from "./phase";

/**
 * Groups an action log into possession phases (`docs/engine-pacing.md`): one side's control of the
 * ball, from winning it until it loses it, shoots, is fouled or knocks it out of play, or the period
 * ends. Every action belongs to exactly one phase, in order, and a phase never crosses a period. A
 * period change is a phase of its own. A short phase without a shot (fewer than `MIN_PHASE_ACTIONS`
 * actions) is merged into a neighbour (`merge-phases.ts`). Pure and without random draws: it reads
 * the log and nothing else.
 */
export const toPhases = (events: readonly ActionEvent[]): Phase[] =>
  mergeShort(events, groupActions(events)).map((raw) => buildPhase(events, raw));
