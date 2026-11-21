import type { TeamSheet } from "../action/team-sheet";
import type { PerSide } from "../per-side";
import { createRng } from "../rng";
import { drawPhaseStep } from "./draw-phase-step";
import { nextPhaseState } from "./next-phase-state";
import { kickoffState } from "./phase-state";
import type { PhaseStep } from "./phase-step";

/** Test support: the steps of one 45-minute half drawn in a row from kick-off, no match loop yet. */
export const drawHalf = (sheets: PerSide<TeamSheet>, seed: number, seconds = 2700): PhaseStep[] => {
  const rng = createRng(seed).fork("phase-sim");
  const steps: PhaseStep[] = [];
  let state = kickoffState(sheets, seconds);
  for (;;) {
    const step = drawPhaseStep(state, rng);
    steps.push(step);
    const next = nextPhaseState(state, step);
    if (next === undefined) return steps;
    state = next;
  }
};
