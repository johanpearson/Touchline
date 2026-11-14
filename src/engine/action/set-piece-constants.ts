import { PENALTY_AREA_DEPTH } from "./decision-constants";
import { PITCH_LENGTH, PITCH_WIDTH } from "./pitch-metres";

/**
 * Tuning values of the set-up shapes. Every point is in the taker's attacking frame: x is the depth
 * towards the goal the taker's side attacks (0 is its own goal line, 105 the goal line it attacks),
 * y is across the pitch.
 */

export const CENTRE_X = PITCH_LENGTH / 2;
export const CENTRE_Y = PITCH_WIDTH / 2;
/** Radius of the centre circle and of the wall distance, metres. */
export const CIRCLE_RADIUS = 9.15;
/** The kickoff opponents stay a little outside the circle. */
export const KICKOFF_CIRCLE_MARGIN = 0.35;
/** The kickoff taker's own side stays this far inside its own half. */
export const KICKOFF_OWN_LIMIT = CENTRE_X - 1;
export const KICKOFF_SUPPORT_OFFSET = { x: -2, y: 4 };

/** Throw-in: the two options relative to the thrower (x towards the attacked goal, y towards the pitch). */
export const THROW_OPTIONS = [
  { x: 8, y: 7 },
  { x: -6, y: 11 },
] as const;
/** A marker stands this far goalside (towards the goal the thrower's side attacks) of an option. */
export const MARKER_GOALSIDE = 2;

/** Goal kick: the two split defenders and the opponents' pressing line. */
export const GOAL_KICK_SPLIT = [
  { x: 12, y: 17 },
  { x: 12, y: 51 },
] as const;
export const GOAL_KICK_PRESS = [
  { x: 26, y: 14 },
  { x: 26, y: 28 },
  { x: 26, y: 40 },
  { x: 26, y: 54 },
] as const;
/** The pressing team stays outside the penalty area (plus a metre). */
export const GOAL_KICK_PRESS_MIN_X = PENALTY_AREA_DEPTH + 1;

/** Corner: runners relative to the goal, in the taker's frame (`y` is mirrored for the far side). */
export const GOAL_POST_OFFSET = 3.66;
export const CORNER_NEAR_POST = { x: 101, y: 4.5 };
export const CORNER_FAR_POST = { x: 101, y: -4.5 };
export const CORNER_PENALTY_SPOT = { x: 94, y: 0 };
export const CORNER_EDGE = [
  { x: 88, y: -11 },
  { x: 88, y: 11 },
] as const;
export const CORNER_COUNTER_COVER = [
  { x: 50, y: -10 },
  { x: 50, y: 10 },
] as const;
/** Defending a corner: the keeper, two players on the posts, markers a step goalside of the runners. */
export const CORNER_KEEPER = { x: 104, y: 0 };
/** At a corner the markers of the runners stand closer, so they keep clear of the players on the posts. */
export const CORNER_MARKER_GOALSIDE = 0.5;
export const CORNER_POSTS = [
  { x: 104.4, y: -3 },
  { x: 104.4, y: 3 },
] as const;

/** Free kick: shooting range (metres from the goal centre), wall and runners. */
export const FREE_KICK_RANGE = 32;
export const WALL_SIZE = 4;
export const WALL_SPACING = 0.8;
export const FREE_KICK_RUNNER_OFFSET = 2.5;
export const FREE_KICK_BOX_RUNNERS = [
  { x: 97, y: -6 },
  { x: 97, y: 6 },
] as const;
export const FREE_KICK_OUT_OF_RANGE_RUNNERS = [
  { x: 8, y: 8 },
  { x: 8, y: -8 },
] as const;
export const FREE_KICK_KEEPER_DEPTH = 103.5;
export const FREE_KICK_KEEPER_SHIFT = 0.1;
export const FREE_KICK_KEEPER_SHIFT_MAX = 2;

/** Penalty: everyone but the taker and the keeper stands behind this depth (outside the box and the arc). */
export const PENALTY_OTHERS_MAX_X = 84.5;
export const PENALTY_KEEPER = { x: PITCH_LENGTH, y: CENTRE_Y };

/** Shot pressure of a direct free kick over the wall. */
export const FREE_KICK_SHOT_PRESSURE = 0.3;
