import type { Side } from "../match-state";
import type { Point } from "./pitch-metres";
import { PRESSURE_RADIUS, PRESSURE_SATURATION } from "./shape-constants";

export type Shapes = { home: readonly Point[]; away: readonly Point[] };

/**
 * How heavily a player of `side` standing on `point` is pressed, 0..1. Each opponent within
 * `radius` (default `PRESSURE_RADIUS`, the opponent's press trigger distance) counts (1 - distance / radius); `PRESSURE_SATURATION` such counts give 1.
 */
export const pressureOn = (
  point: Point,
  side: Side,
  shapes: Shapes,
  radius: number = PRESSURE_RADIUS,
): number => {
  const opponents = side === "home" ? shapes.away : shapes.home;
  const total = opponents.reduce((sum, o) => {
    const d = Math.hypot(o.x - point.x, o.y - point.y);
    return d >= radius ? sum : sum + (1 - d / radius);
  }, 0);
  return Math.min(1, total / PRESSURE_SATURATION);
};
