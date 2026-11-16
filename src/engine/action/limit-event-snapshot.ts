import type { ActionEvent, PositionSnapshot } from "./action-event";
import { keepActorOnBall } from "./keep-actor-on-ball";
import { limitSnapshotSpeed } from "./limit-snapshot-speed";
import { MAX_SNAPSHOT_SPEED } from "./loop-constants";
import type { MatchInput } from "./match-input";

/** Keeps the actor of a pass, carry or shot on the ball (slots: home 0 to 10, away 11 to 21). */
const keepActor = (
  event: ActionEvent,
  snapshot: PositionSnapshot,
  input: MatchInput,
): PositionSnapshot => {
  if (event.type !== "pass" && event.type !== "carry" && event.type !== "shot") return snapshot;
  const ids = [...input.home.starters, ...input.away.starters].map((p) => p.id);
  return keepActorOnBall(snapshot, ids.indexOf(event.actor));
};

/**
 * The event with its snapshot capped at a sprint from the snapshot of the event before it (`before`),
 * and the actor kept on the ball. Restarts place players freely, so set pieces and period changes,
 * events without a snapshot and the first event are returned as they are.
 */
export const limitEventSnapshot = (
  event: ActionEvent,
  before: ActionEvent | undefined,
  input: MatchInput,
): ActionEvent => {
  if (event.snapshot === undefined) return event;
  if (event.type === "setPiece" || event.type === "periodChange") return event;
  if (before?.snapshot === undefined) return event;
  const snapshot = limitSnapshotSpeed(
    before.snapshot,
    event.snapshot,
    event.time - before.time,
    MAX_SNAPSHOT_SPEED,
  );
  return { ...event, snapshot: keepActor(event, snapshot, input) };
};
