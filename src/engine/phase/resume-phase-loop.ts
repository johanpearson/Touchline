import { restartEnergyClock } from "../action/energy-state";
import { HALF_SECONDS } from "../action/loop-constants";
import type { PhaseLoopContext, PhaseLoopState } from "./phase-loop-state";
import { kickoffState } from "./phase-state";
import { playStep } from "./play-step";

/**
 * Starts the second half after half-time: the side that did not start the match kicks off, the half
 * ends `secondHalfAdded` seconds of added time after 45 minutes, and the kickoff step is played.
 * Throws an `Error` when the match is not at half-time.
 */
export const resumePhaseLoop = (
  state: PhaseLoopState,
  context: PhaseLoopContext,
): PhaseLoopState => {
  if (state.period !== "halfTime") throw new Error(`Cannot resume from ${state.period}`);
  const periodEnd = state.time + HALF_SECONDS + context.secondHalfAdded;
  const energy = restartEnergyClock(state.energy, state.time);
  const sheets = { home: energy.effective.home, away: energy.effective.away };
  const kickoff = kickoffState(sheets, periodEnd);
  const team = context.firstKickoff === "home" ? "away" : "home";
  return playStep(
    {
      ...state,
      energy,
      period: "secondHalf",
      periodEnd,
      possession: team,
      ball: { ...kickoff.ball },
      next: { ...kickoff, team, period: "secondHalf", time: state.time },
    },
    context,
  );
};
