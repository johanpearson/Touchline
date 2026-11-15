import { describe, expect, it } from "vitest";
import { PITCH_LENGTH, PITCH_WIDTH } from "./pitch-metres";
import { MIN_PLAYER_DISTANCE, PITCH_MARGIN } from "./shape-constants";
import { keepApart } from "./team-shape";

type Local = { depth: number; y: number };
const at = (depth: number, y: number): Local => ({ depth, y });
const gap = (a: Local, b: Local) => Math.hypot(a.depth - b.depth, a.y - b.y);

describe("keepApart", () => {
  it("leaves players who are far enough apart exactly where they are", () => {
    const block = [at(30, 20), at(30, 34), at(50, 34)];
    expect(keepApart(block)).toEqual(block);
  });

  it("does not move two players who stand exactly the minimum distance apart", () => {
    const block = [at(30, 20), at(30 + MIN_PLAYER_DISTANCE, 20)];
    expect(keepApart(block)).toEqual(block);
  });

  it("does not push players who are close on one axis only", () => {
    const block = [at(30, 20), at(30 + 1, 20 + MIN_PLAYER_DISTANCE)];
    expect(keepApart(block)).toEqual(block);
    const other = [at(30, 20), at(30 + MIN_PLAYER_DISTANCE, 20 + 1)];
    expect(keepApart(other)).toEqual(other);
  });

  it("pushes two close players apart along their line until they are the minimum distance apart", () => {
    const [a, b] = keepApart([at(30, 20), at(31, 20)]) as [Local, Local];
    expect(gap(a, b)).toBeGreaterThanOrEqual(MIN_PLAYER_DISTANCE);
    expect(gap(a, b)).toBeLessThan(MIN_PLAYER_DISTANCE + 0.05);
    expect(a.depth).toBeLessThan(30);
    expect(b.depth).toBeGreaterThan(31);
    expect(a.y).toBe(20);
    expect(b.y).toBe(20);
  });

  it("moves both players of a pair by the same amount, keeping their midpoint", () => {
    const [a, b] = keepApart([at(40, 30), at(40, 31)]) as [Local, Local];
    expect((a.y + b.y) / 2).toBeCloseTo(30.5, 9);
    expect(a.depth).toBe(40);
    expect(b.depth).toBe(40);
    expect(a.y).toBeLessThan(b.y);
  });

  it("pushes players standing on the same spot apart sideways, the first towards lower y", () => {
    const [a, b] = keepApart([at(40, 34), at(40, 34)]) as [Local, Local];
    expect(a.depth).toBe(40);
    expect(b.depth).toBe(40);
    expect(a.y).toBeLessThan(b.y);
    expect(gap(a, b)).toBeGreaterThanOrEqual(MIN_PLAYER_DISTANCE);
  });

  it("separates a crowd of five by working over several passes", () => {
    const crowd = [at(40, 30), at(40.5, 31), at(41, 32), at(40, 33), at(41, 31)];
    const result = keepApart(crowd);
    for (let i = 0; i < result.length; i++) {
      for (let j = i + 1; j < result.length; j++) {
        expect(gap(result[i] as Local, result[j] as Local)).toBeGreaterThan(
          MIN_PLAYER_DISTANCE - 0.2,
        );
      }
    }
  });

  it("keeps everyone inside the pitch margin, also after being pushed outwards", () => {
    const result = keepApart([
      at(0, 0),
      at(PITCH_LENGTH, PITCH_WIDTH),
      at(PITCH_LENGTH - 0.5, PITCH_WIDTH - 0.5),
    ]);
    for (const p of result) {
      expect(p.depth).toBeGreaterThanOrEqual(PITCH_MARGIN);
      expect(p.depth).toBeLessThanOrEqual(PITCH_LENGTH - PITCH_MARGIN);
      expect(p.y).toBeGreaterThanOrEqual(PITCH_MARGIN);
      expect(p.y).toBeLessThanOrEqual(PITCH_WIDTH - PITCH_MARGIN);
    }
    expect(result[0]).toEqual(at(PITCH_MARGIN, PITCH_MARGIN));
  });

  it("does not change the input", () => {
    const block = [at(30, 20), at(31, 20)];
    keepApart(block);
    expect(block).toEqual([at(30, 20), at(31, 20)]);
  });

  it("is deterministic", () => {
    const block = [at(30, 20), at(31, 20.5), at(30.5, 21)];
    expect(keepApart(block)).toEqual(keepApart(block));
  });
});
