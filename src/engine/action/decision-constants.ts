import type { Mentality, Pressing, Tempo, Width } from "../tactics";
import type { PassVariant } from "./action-event";

/**
 * Tuning values of the open-play decisions and outcomes (first guesses; the balance issue calibrates
 * them). Every value is named so calibration happens here. Probabilities are clamped to named bounds.
 */

// Option weights
export const PASS_BASE_WEIGHT = 1;
/** Multiplies the weight of long passes (calibration: the long ball is the exception, not the default). */
export const LONG_PASS_FACTOR = 0.3;
export const CARRY_BASE_WEIGHT = 1.1;
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
export const TEMPO_DIRECTNESS: Record<Tempo, number> = { slow: -0.2, normal: 0, fast: 0.2 };
export const MENTALITY_DIRECTNESS: Record<Mentality, number> = {
  defensive: -0.15,
  balanced: 0,
  attacking: 0.15,
};
/** Multiplies the weight of risky passes (long, through, cross). */
export const MENTALITY_RISK: Record<Mentality, number> = {
  defensive: 0.8,
  balanced: 1,
  attacking: 1.2,
};
/** Multiplies the weight of passes to wide targets and of crosses. */
export const WIDTH_WIDE_BONUS: Record<Width, number> = { narrow: 0.8, normal: 1, wide: 1.5 };
/** Base directness weight on forward progress before tactics are added. */
export const BASE_DIRECTNESS = 0.5;
/** Share of the carry weight added per unit of directness. */
export const CARRY_DIRECTNESS_GAIN = 0.3;

/**
 * Multiplies the weight of through passes, carries and shots of an opponent that has just won the ball
 * (space behind an attacking side; a defensive side keeps its shape). Combined with pressing.
 */
export const MENTALITY_SPACE_BEHIND: Record<Mentality, number> = {
  defensive: 0.75,
  balanced: 1,
  attacking: 2.6,
};

/** Multiplies the same counter weights against a narrow side that leaves the flanks open. */
export const WIDTH_SPACE_BEHIND: Record<Width, number> = { narrow: 1.4, normal: 1, wide: 1 };

export const RISKY_VARIANTS: readonly PassVariant[] = ["long", "through", "cross"];

// Tactics in v2 (see tactics-parameters.ts; neutral settings add 0 or multiply by 1)
/** Added to the pass completion chance of the team's own passes. */
export const TEMPO_PASS_SUCCESS: Record<Tempo, number> = { slow: 0.04, normal: 0, fast: -0.05 };
/** Multiplies the weight of a shot taken from the central channel. */
export const WIDTH_CENTRAL_SHOT: Record<Width, number> = { narrow: 1.1, normal: 1, wide: 0.9 };
/** A shot is central when it is at most this many metres from the middle line. */
export const CENTRAL_SHOT_CHANNEL = 11;
/** Multiplies the radius within which the team's opponents feel its pressure (press trigger distance). */
export const PRESSING_TRIGGER_SCALE: Record<Pressing, number> = { low: 0.9, medium: 1, high: 1.12 };
/** Added to the chance of winning the ball (interception, lost carry) against an opponent building up in their own half. */
export const PRESSING_TURNOVER_BONUS: Record<Pressing, number> = {
  low: -0.02,
  medium: 0,
  high: 0.03,
};
/** Multiplies the weight of through passes and carries of an opponent that has just won the ball (space behind the press). */
export const PRESSING_SPACE_BEHIND: Record<Pressing, number> = { low: 0.8, medium: 1, high: 1.6 };

/**
 * Home advantage: added to the success chance of the home side's passes, carries, interceptions and
 * tackles. A first guess; the balance issue tunes it for a home win rate of 42% to 48%.
 */
export const HOME_ADVANTAGE = 0.012;

// Pass outcome
export const PASS_BASE_COMPLETE: Record<PassVariant, number> = {
  short: 0.96,
  long: 0.7,
  through: 0.66,
  cross: 0.7,
};
export const PASS_SKILL_GAIN = 0.3;
export const PASS_RECEIVER_GAIN = 0.1;
export const PASS_PRESSURE_PENALTY = 0.3;
export const PASS_COMPLETE_MIN = 0.15;
export const PASS_COMPLETE_MAX = 0.97;
/** Share of failed passes that go out of play (the rest stay in play and are lost). */
export const PASS_OUT_SHARE: Record<PassVariant, number> = {
  short: 0.25,
  long: 0.4,
  through: 0.3,
  cross: 0.5,
};
/** Share of crosses that go behind the opponent's goal line and are deflected (corner) instead of reaching the goal kick. */
export const CROSS_DEFLECTED_CORNER_SHARE = 0.9;
/** Share of intercepted crosses that the defender puts behind the goal line (a corner) instead of keeping the ball. */
export const CROSS_INTERCEPTED_CORNER_SHARE = 0.7;
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
export const CARRY_OUT_MARGIN = 5;
/** When a carry can fail both ways, the share of failures that go out of play. */
export const CARRY_OUT_SHARE = 0.7;

// Challenge (tackle) outcome
export const FOUL_BASE = 0.25;
export const FOUL_SKILL_GAIN = 0.4;
export const FOUL_MIN = 0.02;
export const FOUL_MAX = 0.45;
export const TACKLE_WIN_BASE = 0.45;
export const TACKLE_WIN_SKILL_GAIN = 0.4;
export const TACKLE_WIN_PRESSURE_GAIN = 0.1;
export const TACKLE_WIN_MIN = 0.1;
export const TACKLE_WIN_MAX = 0.8;
/** Multiplies the foul chance of a defender challenging inside their own penalty area (defenders stay on their feet there). */
export const PENALTY_AREA_FOUL_FACTOR = 0.4;
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

// Shots and xG
/** Goal centre and width (metres). Posts are `GOAL_WIDTH / 2` either side of the centre line. */
export const GOAL_WIDTH = 7.32;
/** Logistic xG model: `logit = XG_INTERCEPT + XG_DISTANCE_GAIN * distance + XG_ANGLE_GAIN * angle` (angle in radians subtended by the posts). */
export const XG_INTERCEPT = -2.1;
export const XG_DISTANCE_GAIN = -0.15;
export const XG_ANGLE_GAIN = 2;
/** Share of xG lost at full pressure (0..1). */
export const XG_PRESSURE_PENALTY = 0.5;
/** Multiplies xG for headers. */
export const XG_HEADER_FACTOR = 0.6;
/** No open-play shot is worth more than this. */
export const MAX_SHOT_XG = 0.6;
/** A penalty is worth a fixed xG (the keeper still decides the outcome). */
export const PENALTY_XG = 0.76;

// Shot option weight
/** Below this xG a shot is never chosen (weight 0). */
export const SHOT_MIN_XG = 0.01;
/** Option weight per unit of xG, before finishing and mentality. */
export const SHOT_WEIGHT_GAIN = 12;
/** Share of the shot weight that depends on finishing (an average 10 keeps 1). */
export const SHOT_FINISHING_GAIN = 0.5;
export const MENTALITY_SHOT: Record<Mentality, number> = {
  defensive: 0.95,
  balanced: 1,
  attacking: 1.05,
};

// Shot resolution
/** Goal chance = xG x finishing factor x keeper factor, clamped. */
export const FINISHING_GOAL_GAIN = 0.6;
export const KEEPER_GOAL_GAIN = 0.6;
export const GOAL_CHANCE_MAX = 0.95;
/** Weights that split the non-goal remainder between woodwork, blocked, saved and missed. */
export const WOODWORK_WEIGHT = 0.03;
export const SAVED_WEIGHT = 0.45;
export const MISSED_WEIGHT = 0.4;
export const BLOCKED_WEIGHT_PER_BLOCKER = 0.2;
/** Opponents within this many metres of the shot lane can block it. */
export const SHOT_BLOCK_RADIUS = 1.5;
/** After a block: share that goes behind for a corner (the rest is a loose ball for the blocker). */
export const BLOCK_CORNER_SHARE = 0.3;
/** After a save: cumulative shares for a corner, then a catch; the rest is a rebound. */
export const SAVE_CORNER_SHARE = 0.2;
export const SAVE_CATCH_SHARE = 0.5;
/** Metres in front of the goal line where a rebound lands. */
export const REBOUND_DISTANCE = 6;
