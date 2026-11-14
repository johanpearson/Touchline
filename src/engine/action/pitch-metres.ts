import type { PitchPosition } from "../match-state";

/** A point on the pitch in metres: x from the home goal line (0) to the away goal line, y across the width. */
export type Point = { x: number; y: number };

export const PITCH_LENGTH = 105;
export const PITCH_WIDTH = 68;

/** True when `point` is on the pitch, lines included. */
export const inPitch = (point: Point): boolean =>
  point.x >= 0 && point.x <= PITCH_LENGTH && point.y >= 0 && point.y <= PITCH_WIDTH;

/** Converts metres to the zone engine's normalised coordinates (0..1 on both axes). */
export const toNormalised = (point: Point): PitchPosition => ({
  x: point.x / PITCH_LENGTH,
  y: point.y / PITCH_WIDTH,
});

/** Converts the zone engine's normalised coordinates to metres. */
export const fromNormalised = (position: PitchPosition): Point => ({
  x: position.x * PITCH_LENGTH,
  y: position.y * PITCH_WIDTH,
});
