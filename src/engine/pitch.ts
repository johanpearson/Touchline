import type { Side } from "./match-state";

/** How far a ball at `x` has advanced towards the goal `side` attacks, 0 (own goal) to 1 (opponent goal). */
export const progressOf = (side: Side, x: number): number => (side === "home" ? x : 1 - x);

/** The x coordinate that corresponds to `progress` for `side`. */
export const xAtProgress = (side: Side, progress: number): number =>
  side === "home" ? progress : 1 - progress;

export const opponentOf = (side: Side): Side => (side === "home" ? "away" : "home");

export const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));
