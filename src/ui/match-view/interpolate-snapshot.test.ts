import { describe, expect, it } from "vitest";
import type { ActionEvent, PositionSnapshot } from "../../engine";
import { interpolateSnapshot } from "./interpolate-snapshot";

const snapshotAt = (x: number, y = 30): PositionSnapshot => ({
  ball: { x, y },
  players: Array.from({ length: 22 }, (_, i) => ({ x: x + i, y: y + i / 2 })),
});

const carry = (time: number, x: number, extra: Partial<ActionEvent> = {}): ActionEvent =>
  ({
    type: "carry",
    time,
    period: "firstHalf",
    team: "home",
    actor: "h1",
    from: { x, y: 30 },
    to: { x, y: 30 },
    pressure: 0,
    outcome: "kept",
    snapshot: snapshotAt(x),
    ...extra,
  }) as ActionEvent;

describe("interpolateSnapshot", () => {
  const events = [carry(10, 20), carry(20, 40)];

  it("returns nothing for a log without snapshots", () => {
    expect(interpolateSnapshot([carry(10, 20, { snapshot: undefined })], 10)).toBeUndefined();
    expect(interpolateSnapshot([], 10)).toBeUndefined();
  });

  it("returns the snapshot exactly at an event time", () => {
    expect(interpolateSnapshot(events, 10)).toEqual(snapshotAt(20));
    expect(interpolateSnapshot(events, 20)).toEqual(snapshotAt(40));
  });

  it("interpolates linearly between the two surrounding snapshots", () => {
    const mid = interpolateSnapshot(events, 15);
    expect(mid?.ball).toEqual({ x: 30, y: 30 });
    expect(mid?.players[3]).toEqual({ x: 33, y: 31.5 });
    expect(mid?.players).toHaveLength(22);
  });

  it("holds the nearest snapshot before the first and after the last event", () => {
    expect(interpolateSnapshot(events, 0)).toEqual(snapshotAt(20));
    expect(interpolateSnapshot(events, 999)).toEqual(snapshotAt(40));
  });

  it("skips events without a snapshot", () => {
    const log = [carry(10, 20), carry(15, 0, { snapshot: undefined }), carry(20, 40)];
    expect(interpolateSnapshot(log, 15)?.ball.x).toBe(30);
  });

  it("snaps at a period change instead of interpolating", () => {
    const log = [
      carry(2700, 20),
      carry(2700, 52, { type: "periodChange", period: "secondHalf" } as Partial<ActionEvent>),
    ];
    expect(interpolateSnapshot(log, 2699)).toEqual(snapshotAt(20));
    expect(interpolateSnapshot(log, 2700)).toEqual(snapshotAt(52));
  });

  it("snaps to a kickoff after a goal", () => {
    const kickoff = carry(130, 52.5, {
      type: "setPiece",
      variant: "kickoff",
      outcome: "taken",
    } as Partial<ActionEvent>);
    const log = [carry(100, 100), kickoff];
    expect(interpolateSnapshot(log, 129.9)).toEqual(snapshotAt(100));
    expect(interpolateSnapshot(log, 130)).toEqual(snapshotAt(52.5));
  });

  it("snaps when the period changes between two snapshots", () => {
    const log = [carry(100, 20), carry(200, 60, { period: "secondHalf" })];
    expect(interpolateSnapshot(log, 150)).toEqual(snapshotAt(20));
  });

  it("keeps every position on the pitch", () => {
    const wild: PositionSnapshot = {
      ball: { x: -5, y: 80 },
      players: Array.from({ length: 22 }, () => ({ x: 200, y: -3 })),
    };
    const log = [carry(10, 20), carry(20, 40, { snapshot: wild })];
    const result = interpolateSnapshot(log, 15);
    for (const p of [result?.ball, ...(result?.players ?? [])]) {
      expect(p?.x).toBeGreaterThanOrEqual(0);
      expect(p?.x).toBeLessThanOrEqual(105);
      expect(p?.y).toBeGreaterThanOrEqual(0);
      expect(p?.y).toBeLessThanOrEqual(68);
    }
  });
});
