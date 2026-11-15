import { describe, expect, it } from "vitest";
import type { PositionSnapshot } from "./action-event";
import { limitSnapshotSpeed } from "./limit-snapshot-speed";

const snapshot = (...players: [number, number][]): PositionSnapshot => ({
  ball: { x: 50, y: 30 },
  players: players.map(([x, y]) => ({ x, y })),
});

describe("limitSnapshotSpeed", () => {
  it("keeps a player that moves slower than the limit exactly where the snapshot puts them", () => {
    const result = limitSnapshotSpeed(snapshot([10, 10]), snapshot([15, 10]), 2, 10);

    expect(result.players[0]).toEqual({ x: 15, y: 10 });
  });

  it("stops a faster player at the limit, on the line towards the target", () => {
    const result = limitSnapshotSpeed(snapshot([10, 10]), snapshot([50, 10]), 2, 10);

    expect(result.players[0]).toEqual({ x: 30, y: 10 });
  });

  it("limits the diagonal distance, not each axis", () => {
    const result = limitSnapshotSpeed(snapshot([0, 0]), snapshot([30, 40]), 1, 10);

    expect(result.players[0]?.x).toBeCloseTo(6);
    expect(result.players[0]?.y).toBeCloseTo(8);
  });

  it("limits every player on their own and leaves the ball untouched", () => {
    const result = limitSnapshotSpeed(snapshot([0, 0], [0, 0]), snapshot([100, 0], [5, 0]), 1, 10);

    expect(result.players).toEqual([
      { x: 10, y: 0 },
      { x: 5, y: 0 },
    ]);
    expect(result.ball).toEqual({ x: 50, y: 30 });
  });

  it("returns the snapshot unchanged when the time step is not positive", () => {
    const next = snapshot([80, 10]);

    expect(limitSnapshotSpeed(snapshot([10, 10]), next, 0, 10)).toBe(next);
  });
});
