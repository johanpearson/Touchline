import type { Mentality, Pressing, Width } from "../tactics";
import { PITCH_LENGTH, PITCH_WIDTH } from "./pitch-metres";
import type { TeamPhase } from "./team-phase-name";

/**
 * Tuning values of the team shape. Depths are metres from the side's own goal line along the
 * pitch (the shape is built for a team attacking towards increasing depth; the away side is
 * mirrored at the end). Lateral values are metres from the centre line. Every value is named so
 * the balance work can tune it in one place. The neutral tactics (balanced, medium, normal) and
 * the `progression` phase are the baseline: they add exactly zero.
 */

export const GOALKEEPER_DEPTH = 5;
export const DEFENCE_DEPTH = 30;
export const MIDFIELD_DEPTH = 52;
export const ATTACK_DEPTH = 72;

/** How much of the block shift the goalkeeper follows (0 stays on the line, 1 moves with the block). */
export const GOALKEEPER_FOLLOW = 0.25;

/** Lateral spread of a full line: the outermost lane of a line of n sits on an even split of the width. */
export const CENTRE_Y = PITCH_WIDTH / 2;

/** Metres the whole block moves up (positive) or back (negative) per phase of play. */
export const PHASE_SHIFT: Record<TeamPhase, number> = {
  buildUp: -4,
  progression: 0,
  attack: 8,
  defending: -8,
  transition: 2,
  setPiece: 0,
};

/** Added to the block shift from the pressing setting (high pressing pushes the line up). */
export const PRESSING_LINE_HEIGHT: Record<Pressing, number> = { low: -4, medium: 0, high: 5 };
/** Added to the block shift from the mentality setting. */
export const MENTALITY_LINE_HEIGHT: Record<Mentality, number> = {
  defensive: -1.5,
  balanced: 0,
  attacking: 0,
};

/** Multiplies the distance between lines, measured from the defensive line. Below 1 is more compact. */
export const PRESSING_COMPACTNESS: Record<Pressing, number> = { low: 1.05, medium: 1, high: 0.94 };
export const MENTALITY_COMPACTNESS: Record<Mentality, number> = {
  defensive: 0.96,
  balanced: 1,
  attacking: 1.04,
};

/** Multiplies the lateral spread. */
export const WIDTH_SCALE: Record<Width, number> = { narrow: 0.9, normal: 1, wide: 1.15 };

/** The block shifts towards the ball: metres per metre of ball offset, capped. */
export const BALL_PULL_DEPTH = 0.15;
export const BALL_PULL_DEPTH_MAX = 6;
export const BALL_PULL_LATERAL = 0.2;
export const BALL_PULL_LATERAL_MAX = 5;

/** The nearest outfield players close in on the ball: share of the remaining distance and a cap in metres. */
export const BALL_CLOSE_IN: readonly { share: number; maxMetres: number }[] = [
  { share: 0.3, maxMetres: 8 },
  { share: 0.15, maxMetres: 5 },
];

/** Same-side players are kept at least this far apart, and this far inside the pitch lines. */
export const MIN_PLAYER_DISTANCE = 3;
export const PITCH_MARGIN = 1;
export const SPREAD_PASSES = 12;

/** A turnover keeps both sides in `transition` for this many actions. */
export const TRANSITION_ACTIONS = 3;

/** Pressure: opponents closer than the radius count by how close they are; this many full counts saturate. */
export const PRESSURE_RADIUS = 8;
export const PRESSURE_SATURATION = 2;

export const HALF_WAY = PITCH_LENGTH / 2;
export const THIRD = PITCH_LENGTH / 3;
