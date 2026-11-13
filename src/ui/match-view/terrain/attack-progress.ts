import type { Side } from "../../../engine";

/** How far a ball at `x` has advanced towards the goal `side` attacks, 0 (own goal) to 1 (opponent goal). */
export const attackProgress = (side: Side, x: number): number => (side === "home" ? x : 1 - x);
