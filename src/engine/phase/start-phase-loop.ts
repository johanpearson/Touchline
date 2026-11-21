import type { MatchDetail } from "../action/action-match";
import { initialEnergy } from "../action/energy-state";
import {
  FIRST_HALF_ADDED_MINUTES,
  HALF_SECONDS,
  SECOND_HALF_ADDED_MINUTES,
  SECONDS_PER_MINUTE,
} from "../action/loop-constants";
import type { MatchInput } from "../action/match-input";
import type { Side } from "../match-state";
import { createRng } from "../rng";
import type { PhaseLoopContext, PhaseLoopState } from "./phase-loop-state";
import { kickoffState } from "./phase-state";
import { playStep } from "./play-step";

/** A match as it stands after the kickoff step: its state and its log. */
export type StartedPhaseLoop = {
  readonly state: PhaseLoopState;
  readonly context: PhaseLoopContext;
};

/**
 * Starts a match: forks the simulation stream (`"phase-sim"`) and the added-time stream from the
 * seed, draws who kicks off and the added time of both halves, and plays the kickoff step. Forking
 * does not consume the parent stream, so no stream depends on another.
 */
export const startPhaseLoop = (
  input: MatchInput,
  seed: number,
  detail: MatchDetail,
  energyPenalty: Readonly<Record<Side, boolean>>,
): StartedPhaseLoop => {
  const root = createRng(seed);
  const sim = root.fork("phase-sim");
  const addedTimeRng = root.fork("addedTime");
  const addedSeconds = (range: { min: number; max: number }) =>
    addedTimeRng.int(range.min, range.max) * SECONDS_PER_MINUTE;
  const firstKickoff: Side = sim.chance(0.5) ? "home" : "away";
  const periodEnd = HALF_SECONDS + addedSeconds(FIRST_HALF_ADDED_MINUTES);
  const secondHalfAdded = addedSeconds(SECOND_HALF_ADDED_MINUTES);
  const energy = initialEnergy(input, energyPenalty);
  const sheets = { home: energy.effective.home, away: energy.effective.away };
  const context: PhaseLoopContext = {
    steps: [],
    events: [],
    sim,
    seed,
    detail,
    firstKickoff,
    secondHalfAdded,
  };
  const initial: PhaseLoopState = {
    input,
    period: "firstHalf",
    time: 0,
    periodEnd,
    next: { ...kickoffState(sheets, periodEnd), team: firstKickoff },
    energy,
    score: { home: 0, away: 0 },
    fouls: { home: 0, away: 0 },
    possession: firstKickoff,
    ball: { ...kickoffState(sheets, periodEnd).ball },
  };
  return { state: playStep(initial, context), context };
};
