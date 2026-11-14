import type { Side } from "../match-state";
import {
  GOAL_WIDTH,
  MAX_SHOT_XG,
  XG_ANGLE_GAIN,
  XG_DISTANCE_GAIN,
  XG_HEADER_FACTOR,
  XG_INTERCEPT,
  XG_PRESSURE_PENALTY,
} from "./decision-constants";
import { PITCH_LENGTH, PITCH_WIDTH, type Point } from "./pitch-metres";

export type BodyPart = "foot" | "head";

/** Maps a point so that `side` attacks towards x = 105 (the away side is the x-mirror). */
export const toAttackingFrame = (side: Side, point: Point): Point =>
  side === "home" ? point : { x: PITCH_LENGTH - point.x, y: point.y };

/** Angle in radians the goal subtends from `from`, a point in the attacking frame. */
const goalAngle = (from: Point): number => {
  const dx = PITCH_LENGTH - from.x;
  const toNear = PITCH_WIDTH / 2 - GOAL_WIDTH / 2 - from.y;
  const toFar = PITCH_WIDTH / 2 + GOAL_WIDTH / 2 - from.y;
  return Math.abs(Math.atan2(dx * toFar - toNear * dx, dx * dx + toNear * toFar));
};

/**
 * Expected goals of a shot from `from` (metres, attacking frame: the goal is at x = 105; see
 * `toAttackingFrame`). A logistic model of the distance to the goal centre and the angle the posts
 * subtend, reduced by `pressure` (0..1) and for headers, capped at `MAX_SHOT_XG`. The v2 model;
 * the zone engine keeps its own `shotXg`.
 */
export const shotXg = (from: Point, pressure: number, bodyPart: BodyPart = "foot"): number => {
  const distance = Math.hypot(PITCH_LENGTH - from.x, PITCH_WIDTH / 2 - from.y);
  const logit = XG_INTERCEPT + XG_DISTANCE_GAIN * distance + XG_ANGLE_GAIN * goalAngle(from);
  const base = 1 / (1 + Math.exp(-logit));
  const pressured = base * (1 - XG_PRESSURE_PENALTY * pressure);
  const body = bodyPart === "head" ? XG_HEADER_FACTOR : 1;
  return Math.min(MAX_SHOT_XG, pressured * body);
};
