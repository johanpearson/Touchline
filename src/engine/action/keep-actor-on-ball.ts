import type { PositionSnapshot } from "./action-event";
import { ACTOR_BALL_HOLD, ACTOR_BALL_REACH } from "./loop-constants";

/**
 * The speed cap can leave the actor of a pass, carry or shot short of the ball (a receiver cannot
 * sprint onto a long pass in the time between two actions). When the actor stands further than
 * `ACTOR_BALL_REACH` from the ball, the ball is shown `ACTOR_BALL_HOLD` metres from the actor on the
 * line towards where it was. Players are never moved, so the speed cap still holds. Pure, RNG-free.
 */
export const keepActorOnBall = (
  snapshot: PositionSnapshot,
  actorSlot: number,
): PositionSnapshot => {
  const actor = snapshot.players[actorSlot];
  if (actor === undefined) return snapshot;
  const dx = snapshot.ball.x - actor.x;
  const dy = snapshot.ball.y - actor.y;
  const distance = Math.hypot(dx, dy);
  if (distance <= ACTOR_BALL_REACH) return snapshot;
  const share = ACTOR_BALL_HOLD / distance;
  return { ...snapshot, ball: { x: actor.x + dx * share, y: actor.y + dy * share } };
};
