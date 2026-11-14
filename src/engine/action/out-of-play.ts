import type { Side } from "../match-state";
import type { Restart } from "./open-play-types";
import { PITCH_LENGTH, PITCH_WIDTH, type Point } from "./pitch-metres";

export type Boundary = "sideLine" | "endLine";
export type Exit = { point: Point; boundary: Boundary };

const GOAL_KICK_DEPTH = 5.5;

/**
 * Where a ball that travels from `from` through `to` (both on the pitch) and keeps going leaves the
 * pitch. A ball without direction is treated as travelling towards the away goal line.
 */
export const exitPoint = (from: Point, to: Point): Exit => {
  const moving = from.x !== to.x || from.y !== to.y;
  const dx = moving ? to.x - from.x : 1;
  const dy = moving ? to.y - from.y : 0;
  const tx = dx > 0 ? (PITCH_LENGTH - to.x) / dx : dx < 0 ? -to.x / dx : Number.POSITIVE_INFINITY;
  const ty = dy > 0 ? (PITCH_WIDTH - to.y) / dy : dy < 0 ? -to.y / dy : Number.POSITIVE_INFINITY;
  const boundary: Boundary = tx <= ty ? "endLine" : "sideLine";
  const t = Math.min(tx, ty);
  // Snap the crossed line exactly and keep the other coordinate on the pitch (no float drift).
  const x = boundary === "endLine" ? (dx > 0 ? PITCH_LENGTH : 0) : to.x + dx * t;
  const y = boundary === "sideLine" ? (dy > 0 ? PITCH_WIDTH : 0) : to.y + dy * t;
  return {
    point: {
      x: Math.min(PITCH_LENGTH, Math.max(0, x)),
      y: Math.min(PITCH_WIDTH, Math.max(0, y)),
    },
    boundary,
  };
};

/** The restart after `side` put the ball out of play at `exit`. */
export const restartAfterOutOfPlay = (side: Side, exit: Exit): Restart => {
  const opponent: Side = side === "home" ? "away" : "home";
  if (exit.boundary === "sideLine") {
    return { team: opponent, variant: "throwIn", position: exit.point };
  }
  const atAwayGoal = exit.point.x >= PITCH_LENGTH / 2;
  const defender: Side = atAwayGoal ? "away" : "home";
  const goalLineX = atAwayGoal ? PITCH_LENGTH : 0;
  if (defender !== side) {
    const kickX = atAwayGoal ? PITCH_LENGTH - GOAL_KICK_DEPTH : GOAL_KICK_DEPTH;
    return { team: defender, variant: "goalKick", position: { x: kickX, y: PITCH_WIDTH / 2 } };
  }
  const cornerY = exit.point.y < PITCH_WIDTH / 2 ? 0 : PITCH_WIDTH;
  return { team: opponent, variant: "corner", position: { x: goalLineX, y: cornerY } };
};
