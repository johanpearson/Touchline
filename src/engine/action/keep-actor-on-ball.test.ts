import { describe, expect, it } from "vitest";
import type { PositionSnapshot } from "./action-event";
import { keepActorOnBall } from "./keep-actor-on-ball";

const snapshotWith = (ball: { x: number; y: number }, actor: { x: number; y: number }) => {
  const players = Array.from({ length: 22 }, () => ({ x: 50, y: 30 }));
  players[3] = actor;
  return { ball, players } satisfies PositionSnapshot;
};

describe("keepActorOnBall", () => {
  it("leaves the snapshot alone when the actor is within reach of the ball", () => {
    const snapshot = snapshotWith({ x: 40, y: 20 }, { x: 41, y: 20.5 });

    expect(keepActorOnBall(snapshot, 3)).toBe(snapshot);
  });

  it("moves the ball to the actor's side along the line between them when the actor is short of it", () => {
    const snapshot = snapshotWith({ x: 40, y: 20 }, { x: 34, y: 12 });

    const result = keepActorOnBall(snapshot, 3);

    expect(result.ball.x).toBeCloseTo(34.6, 6);
    expect(result.ball.y).toBeCloseTo(12.8, 6);
    expect(result.players).toBe(snapshot.players);
  });

  it("is a no-op for an unknown slot", () => {
    const snapshot = snapshotWith({ x: 40, y: 20 }, { x: 0, y: 0 });

    expect(keepActorOnBall(snapshot, -1)).toBe(snapshot);
  });
});
