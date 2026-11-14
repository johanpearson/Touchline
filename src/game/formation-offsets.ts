import type { TeamMatchProfile } from "../engine";
import type { Formation } from "./formation";

export type PhaseRating = Exclude<keyof TeamMatchProfile, "name">;

export const PHASE_RATINGS: readonly PhaseRating[] = [
  "buildUp",
  "progression",
  "chanceCreation",
  "finishing",
  "pressing",
  "defending",
  "goalkeeping",
];

/** No formation may move a phase rating (0..1) by more than this. */
export const MAX_FORMATION_OFFSET = 0.06;

type Offsets = Record<PhaseRating, number>;

const NONE: Offsets = {
  buildUp: 0,
  progression: 0,
  chanceCreation: 0,
  finishing: 0,
  pressing: 0,
  defending: 0,
  goalkeeping: 0,
};

/**
 * Offsets added to the phase ratings derived from the lineup's players, on top of the 4-4-2
 * baseline (all zero). The goalkeeper does not depend on the shape, so goalkeeping is always 0.
 * Each row trades strengths against weaknesses so that no formation is better on every phase.
 */
export const FORMATION_OFFSETS: Record<Formation, Offsets> = {
  // Baseline.
  "4-4-2": NONE,
  // Three forwards press the goal: more chances and finishing, thinner midfield and defence.
  "4-3-3": {
    ...NONE,
    progression: 0.02,
    chanceCreation: 0.03,
    finishing: 0.02,
    buildUp: -0.02,
    defending: -0.03,
  },
  // A packed midfield controls the ball but leaves one lone striker.
  "4-5-1": {
    ...NONE,
    buildUp: 0.03,
    pressing: 0.02,
    chanceCreation: -0.02,
    finishing: -0.03,
  },
  // Wing-backs and five midfielders: more build-up and chances, only three at the back.
  "3-5-2": {
    ...NONE,
    buildUp: 0.04,
    chanceCreation: 0.03,
    pressing: 0.01,
    defending: -0.04,
  },
  // Five defenders: solid, but few players forward to create chances.
  "5-3-2": {
    ...NONE,
    defending: 0.05,
    buildUp: -0.01,
    progression: -0.02,
    chanceCreation: -0.04,
  },
  // Most attacking: forward runs and chances, but exposed with three defenders.
  "3-4-3": {
    ...NONE,
    progression: 0.02,
    chanceCreation: 0.04,
    finishing: 0.03,
    defending: -0.05,
    pressing: -0.01,
  },
};
