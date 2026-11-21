import { drainEnergyTo } from "../action/energy-state";
import type { Side } from "../match-state";
import { drawPhaseStep } from "./draw-phase-step";
import { nextPhaseState } from "./next-phase-state";
import type { PhaseLoopContext, PhaseLoopState } from "./phase-loop-state";
import type { PhaseStep } from "./phase-step";
import { toStepEvents } from "./to-action-events";

const other = (side: Side): Side => (side === "home" ? "away" : "home");

const scoreAfter = (score: PhaseLoopState["score"], step: PhaseStep): PhaseLoopState["score"] =>
  step.outcome === "chance" && step.chance.result === "goal"
    ? { ...score, [step.team]: score[step.team] + 1 }
    : score;

/** A foul counts against the side that committed it, the other one than the fouled `team`. */
const foulsAfter = (fouls: PhaseLoopState["fouls"], step: PhaseStep): PhaseLoopState["fouls"] =>
  step.outcome === "foul" ? { ...fouls, [other(step.team)]: fouls[other(step.team)] + 1 } : fouls;

/**
 * Plays the next step: drains energy up to its start, draws it from the possession with the
 * players as tired as they are then, records it and its derived actions, and returns the state with
 * the next possession. A step that whistles sets the period's real end.
 */
export const playStep = (state: PhaseLoopState, context: PhaseLoopContext): PhaseLoopState => {
  const possession = state.next;
  if (possession === undefined) return state;
  const energy = drainEnergyTo(state.energy, state.input, possession.time);
  const sheets = { home: energy.effective.home, away: energy.effective.away };
  const drawn = { ...possession, sheets };
  const step = drawPhaseStep(drawn, context.sim);
  const index = context.steps.length;
  context.steps.push(step);
  for (const event of toStepEvents(step, index, context.seed, { sheets, detail: context.detail })) {
    context.events.push(event);
  }
  const next = nextPhaseState(drawn, step);
  return {
    ...state,
    energy,
    next,
    periodEnd: step.outcome === "periodEnd" ? step.endTime : state.periodEnd,
    score: scoreAfter(state.score, step),
    fouls: foulsAfter(state.fouls, step),
    possession: next?.team ?? step.team,
    ball: step.chain[step.chain.length - 1]?.at ?? state.ball,
  };
};
