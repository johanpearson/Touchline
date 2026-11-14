import type { Rng } from "../rng";
import type { PositionSnapshot } from "./action-event";
import { clamp } from "./attribute-rating";
import { SNAPSHOT_JITTER_MAX } from "./loop-constants";
import { PITCH_LENGTH, PITCH_WIDTH, type Point } from "./pitch-metres";
import type { Shapes } from "./pressure";

const jitter = (point: Point, rng: Rng): Point => ({
  x: clamp(point.x + (rng.next() * 2 - 1) * SNAPSHOT_JITTER_MAX, 0, PITCH_LENGTH),
  y: clamp(point.y + (rng.next() * 2 - 1) * SNAPSHOT_JITTER_MAX, 0, PITCH_WIDTH),
});

/**
 * Positions at the moment of an action: the exact ball and the 22 players with a small jitter from
 * the presentation stream. Always draws 44 numbers, and decisions never read the result.
 */
export const buildSnapshot = (
  shapes: Shapes,
  ball: Point,
  presentation: Rng,
): PositionSnapshot => ({
  ball,
  players: [...shapes.home, ...shapes.away].map((p) => jitter(p, presentation)),
});
