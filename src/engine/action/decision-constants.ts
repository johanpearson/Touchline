import type { Mentality, Tempo, Width } from "../tactics";
import type { PassVariant } from "./action-event";

/**
 * Tuning values of the open-play decisions and outcomes (first guesses; the balance issue calibrates
 * them). Every value is named so calibration happens here. Probabilities are clamped to named bounds.
 */

// Option weights
export const PASS_BASE_WEIGHT = 1;
export const CARRY_BASE_WEIGHT = 0.9;
export const CLEARANCE_BASE_WEIGHT = 6;
/** Distance in metres over which a pass option loses weight (exponential decay). */
export const PASS_DISTANCE_SCALE = 25;
/** Metres of forward progress that count as a full step in the progress factor. */
export const PROGRESS_SCALE = 30;
export const PROGRESS_FACTOR_MIN = 0.2;
export const PROGRESS_FACTOR_MAX = 3;
/** Weight kept by a pass straight backwards; a straight forward pass keeps 1. */
export const BACKWARD_ANGLE_FACTOR = 0.6;
/** How much a pressed target (0..1) lowers a pass option. */
export const TARGET_PRESSURE_PENALTY = 0.6;
/** How much pressure on the actor lowers risky passes and carries. */
export const ACTOR_PRESSURE_RISK_PENALTY = 0.5;
export const CARRY_DISTANCE = 8;
export const CARRY_SPACE_PENALTY = 0.7;
export const GOALKEEPER_CARRY_FACTOR = 0.1;
/** A clearance is only attractive in the defensive part of the pitch (depth in metres from own goal). */
export const CLEARANCE_DANGER_DEPTH = 30;
export const CLEARANCE_SAFE_FACTOR = 0.1;

// Pass geometry
export const SHORT_PASS_MAX = 20;
export const LONG_PASS_MIN = 35;
export const THROUGH_PASS_MIN_PROGRESS = 15;
export const THROUGH_PASS_MIN_DISTANCE = 15;
export const CROSS_WIDE_CHANNEL = 14;
export const CROSS_MIN_DEPTH = 70;
export const WIDE_TARGET_CHANNEL = 14;

// Tactics
export const TEMPO_DIRECTNESS: Record<Tempo, number> = { slow: -0.3, normal: 0, fast: 0.3 };
export const MENTALITY_DIRECTNESS: Record<Mentality, number> = {
  defensive: -0.2,
  balanced: 0,
  attacking: 0.2,
};
/** Multiplies the weight of risky passes (long, through, cross). */
export const MENTALITY_RISK: Record<Mentality, number> = {
  defensive: 0.8,
  balanced: 1,
  attacking: 1.2,
};
/** Multiplies the weight of passes to wide targets and of crosses. */
export const WIDTH_WIDE_BONUS: Record<Width, number> = { narrow: 0.8, normal: 1, wide: 1.3 };
/** Base directness weight on forward progress before tactics are added. */
export const BASE_DIRECTNESS = 0.5;
/** Share of the carry weight added per unit of directness. */
export const CARRY_DIRECTNESS_GAIN = 0.3;

export const RISKY_VARIANTS: readonly PassVariant[] = ["long", "through", "cross"];

// Pass outcome
export const PASS_BASE_COMPLETE: Record<PassVariant, number> = {
  short: 0.9,
  long: 0.62,
  through: 0.55,
  cross: 0.5,
};
export const PASS_SKILL_GAIN = 0.3;
export const PASS_RECEIVER_GAIN = 0.1;
export const PASS_PRESSURE_PENALTY = 0.3;
export const PASS_COMPLETE_MIN = 0.15;
export const PASS_COMPLETE_MAX = 0.97;
/** Share of failed passes that go out of play (the rest stay in play and are lost). */
export const PASS_OUT_SHARE: Record<PassVariant, number> = {
  short: 0.1,
  long: 0.35,
  through: 0.2,
  cross: 0.4,
};
/** Distance in metres from the pass lane within which an opponent can reach the ball. */
export const LANE_RADIUS = 3;

// Interception
export const INTERCEPT_BASE = 0.25;
export const INTERCEPT_SKILL_GAIN = 0.5;
export const INTERCEPT_PRESSURE_GAIN = 0.2;
export const INTERCEPT_MIN = 0.05;
export const INTERCEPT_MAX = 0.65;

// Carry outcome
export const CARRY_KEPT_BASE = 0.88;
export const CARRY_SKILL_GAIN = 0.25;
export const CARRY_DEFENDER_PENALTY = 0.35;
export const CARRY_PRESSURE_PENALTY = 0.3;
export const CARRY_KEPT_MIN = 0.3;
export const CARRY_KEPT_MAX = 0.97;
/** A failed carry can only go out of play within this many metres of a line. */
export const CARRY_OUT_MARGIN = 3;
/** When a carry can fail both ways, the share of failures that go out of play. */
export const CARRY_OUT_SHARE = 0.5;

// Challenge (tackle) outcome
export const FOUL_BASE = 0.12;
export const FOUL_SKILL_GAIN = 0.4;
export const FOUL_MIN = 0.02;
export const FOUL_MAX = 0.28;
export const TACKLE_WIN_BASE = 0.45;
export const TACKLE_WIN_SKILL_GAIN = 0.4;
export const TACKLE_WIN_PRESSURE_GAIN = 0.1;
export const TACKLE_WIN_MIN = 0.1;
export const TACKLE_WIN_MAX = 0.8;
export const PENALTY_AREA_DEPTH = 16.5;
export const PENALTY_AREA_HALF_WIDTH = 20.16;

// Clearance
export const CLEARANCE_BASE_DISTANCE = 25;
export const CLEARANCE_STRENGTH_GAIN = 10;
export const CLEARANCE_SIDE_PULL = 0.4;
export const CLEARANCE_OUT_BASE = 0.2;
export const CLEARANCE_OUT_SKILL_GAIN = 0.4;
export const CLEARANCE_OUT_PRESSURE_GAIN = 0.15;
export const CLEARANCE_OUT_MIN = 0.05;
export const CLEARANCE_OUT_MAX = 0.5;
/** Metres a player's positioning attribute (0..1) is worth when deciding who reaches a cleared ball. */
export const CLEARANCE_POSITIONING_REACH = 6;

// Time
export const ACTION_MIN_SECONDS = 2;
export const ACTION_MAX_SECONDS = 4;
/** The draw is raised to this power: below 1 gives longer actions, above 1 shorter ones. */
export const TEMPO_DRAW_EXPONENT: Record<Tempo, number> = { slow: 0.7, normal: 1, fast: 1.5 };
