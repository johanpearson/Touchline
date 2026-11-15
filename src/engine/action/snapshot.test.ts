import { describe, expect, it } from "vitest";
import { createRng, type Rng } from "../rng";
import { SNAPSHOT_JITTER_MAX } from "./loop-constants";
import { PITCH_LENGTH, PITCH_WIDTH } from "./pitch-metres";
import { buildSnapshot } from "./snapshot";

const constantRng = (value: number): Rng => ({ ...createRng(1), next: () => value });

const shapes = (x: number, y: number) => ({
  home: Array.from({ length: 11 }, () => ({ x, y })),
  away: Array.from({ length: 11 }, () => ({ x, y })),
});

describe("buildSnapshot", () => {
  it("keeps the ball exactly where it is", () => {
    const ball = { x: 12.5, y: 30.25 };
    expect(buildSnapshot(shapes(50, 30), ball, createRng(3)).ball).toBe(ball);
  });

  it("lists the 11 home players before the 11 away players", () => {
    const home = Array.from({ length: 11 }, (_, i) => ({ x: 10 + i, y: 20 }));
    const away = Array.from({ length: 11 }, (_, i) => ({ x: 60 + i, y: 40 }));
    const { players } = buildSnapshot({ home, away }, { x: 0, y: 0 }, constantRng(0.5));
    expect(players.map((p) => p.x)).toEqual([...home, ...away].map((p) => p.x));
  });

  it("does not move a player when the draw is in the middle of the range", () => {
    const { players } = buildSnapshot(shapes(50, 30), { x: 0, y: 0 }, constantRng(0.5));
    expect(players[0]).toEqual({ x: 50, y: 30 });
  });

  it("moves a player by the full jitter in each direction at the ends of the range", () => {
    const low = buildSnapshot(shapes(50, 30), { x: 0, y: 0 }, constantRng(0)).players[0];
    const high = buildSnapshot(shapes(50, 30), { x: 0, y: 0 }, constantRng(1)).players[0];
    expect(low?.x).toBeCloseTo(50 - SNAPSHOT_JITTER_MAX, 9);
    expect(low?.y).toBeCloseTo(30 - SNAPSHOT_JITTER_MAX, 9);
    expect(high?.x).toBeCloseTo(50 + SNAPSHOT_JITTER_MAX, 9);
    expect(high?.y).toBeCloseTo(30 + SNAPSHOT_JITTER_MAX, 9);
  });

  it("scales the jitter linearly with the draw", () => {
    const p = buildSnapshot(shapes(50, 30), { x: 0, y: 0 }, constantRng(0.75)).players[0];
    expect(p?.x).toBeCloseTo(50 + 0.5 * SNAPSHOT_JITTER_MAX, 9);
    expect(p?.y).toBeCloseTo(30 + 0.5 * SNAPSHOT_JITTER_MAX, 9);
  });

  it("draws x before y for each player and uses a separate draw for each coordinate", () => {
    const draws = [0, 1];
    let i = 0;
    const rng: Rng = { ...createRng(1), next: () => draws[i++ % 2] as number };
    const p = buildSnapshot(shapes(50, 30), { x: 0, y: 0 }, rng).players[0];
    expect(p?.x).toBeCloseTo(50 - SNAPSHOT_JITTER_MAX, 9);
    expect(p?.y).toBeCloseTo(30 + SNAPSHOT_JITTER_MAX, 9);
  });

  it("draws exactly 44 numbers whatever the positions", () => {
    let count = 0;
    const rng: Rng = { ...createRng(1), next: () => (count++, 0.5) };
    buildSnapshot(shapes(50, 30), { x: 0, y: 0 }, rng);
    expect(count).toBe(44);
  });

  it("keeps players inside the pitch at the edges", () => {
    const corner = { home: shapes(0, 0).home, away: shapes(PITCH_LENGTH, PITCH_WIDTH).away };
    const { players } = buildSnapshot(corner, { x: 0, y: 0 }, constantRng(0));
    expect(players[0]).toEqual({ x: 0, y: 0 });
    const far = buildSnapshot(corner, { x: 0, y: 0 }, constantRng(1)).players[11];
    expect(far).toEqual({ x: PITCH_LENGTH, y: PITCH_WIDTH });
  });
});
