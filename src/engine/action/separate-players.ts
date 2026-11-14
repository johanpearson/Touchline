import type { Point } from "./pitch-metres";
import { MIN_PLAYER_DISTANCE } from "./shape-constants";

/** Passes of the relaxation; set-up positions settle in a handful. */
const MAX_PASSES = 80;
/** Pushed a little past the minimum so a settled pair stays clear of it. */
const PUSH_MARGIN = 0.01;

/**
 * Moves players that stand closer than `MIN_PLAYER_DISTANCE` apart, leaving the `fixed` slots
 * exactly where they are. A pair is pushed apart along the line between them; a movable player
 * next to a fixed one takes the whole push, two movable players half each. `limit` keeps a moved
 * player inside the limits of its set-up. Pairs with the `exempt` slot (the taker) and pairs of two
 * fixed slots are left alone. Pure and RNG-free: coincident players split along y by slot order.
 */
export const separate = (
  points: readonly Point[],
  fixed: readonly number[],
  limit: (p: Point) => Point,
  exempt = -1,
): Point[] => {
  const result = points.map((p) => ({ ...p }));
  const isFixed = (i: number): boolean => fixed.includes(i);
  for (let pass = 0; pass < MAX_PASSES; pass++) {
    let moved = false;
    for (let i = 0; i < result.length; i++) {
      for (let j = i + 1; j < result.length; j++) {
        if (i === exempt || j === exempt || (isFixed(i) && isFixed(j))) continue;
        const a = result[i] as Point;
        const b = result[j] as Point;
        const d = Math.hypot(b.x - a.x, b.y - a.y);
        if (d >= MIN_PLAYER_DISTANCE) continue;
        const ux = d === 0 ? 0 : (b.x - a.x) / d;
        const uy = d === 0 ? 1 : (b.y - a.y) / d;
        const push = MIN_PLAYER_DISTANCE - d + PUSH_MARGIN;
        const share = isFixed(i) || isFixed(j) ? 1 : 0.5;
        if (!isFixed(i))
          result[i] = limit({ x: a.x - ux * push * share, y: a.y - uy * push * share });
        if (!isFixed(j))
          result[j] = limit({ x: b.x + ux * push * share, y: b.y + uy * push * share });
        moved = true;
      }
    }
    if (!moved) break;
  }
  return result;
};
