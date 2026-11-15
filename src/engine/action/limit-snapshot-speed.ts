import type { PositionSnapshot } from "./action-event";

/**
 * Pulls every player of `next` back so nobody is further from their place in `previous` than
 * `maxSpeed` metres per second allows over `seconds`. The ball is left alone. Pure and RNG-free,
 * applied to presentation snapshots only (decisions use the unlimited shapes).
 */
export const limitSnapshotSpeed = (
  previous: PositionSnapshot,
  next: PositionSnapshot,
  seconds: number,
  maxSpeed: number,
): PositionSnapshot => {
  if (seconds <= 0) return next;
  const reach = maxSpeed * seconds;
  return {
    ball: next.ball,
    players: next.players.map((p, slot) => {
      const from = previous.players[slot];
      if (!from) return p;
      const distance = Math.hypot(p.x - from.x, p.y - from.y);
      if (distance <= reach) return p;
      const share = reach / distance;
      return { x: from.x + (p.x - from.x) * share, y: from.y + (p.y - from.y) * share };
    }),
  };
};
