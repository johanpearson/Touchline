import { describe, expect, it } from "vitest";
import {
  BURST_LIFE_SECONDS,
  burstColourShare,
  burstEnvelope,
  burstHeight,
  flashAlpha,
} from "./goal-burst";

const burst = (age: number, side: "home" | "away" = "home") => ({ side, x: 0.9, y: 0.5, age });

describe("goal burst", () => {
  it("starts at zero, peaks and fades back to zero", () => {
    expect(burstEnvelope(0)).toBeCloseTo(0, 10);
    expect(burstEnvelope(0.3)).toBeGreaterThan(0.9);
    expect(burstEnvelope(BURST_LIFE_SECONDS)).toBe(0);
  });

  it("is tallest at the goal position", () => {
    expect(burstHeight(burst(0.4), 0.9, 0.5)).toBeGreaterThan(burstHeight(burst(0.4), 0.5, 0.5));
  });

  it("sends a ring outwards over time", () => {
    const early = burstHeight(burst(0.1), 0.9 - 0.1 * 0.55, 0.5);
    const late = burstHeight(burst(1.5), 0.9 - 1.5 * 0.55, 0.5);
    expect(early).toBeGreaterThan(0);
    expect(late).toBeGreaterThan(0.05);
  });

  it("colours the ring in the scorer's colour", () => {
    expect(burstColourShare(burst(0.5, "home"), 0.9, 0.5, 0.5)).toBeLessThan(0.5);
    expect(burstColourShare(burst(0.5, "away"), 0.9, 0.5, 0.5)).toBeGreaterThan(0.5);
  });

  it("leaves colour alone far outside the ring", () => {
    expect(burstColourShare(burst(0.5, "away"), 0, 0, 0.5)).toBeCloseTo(0.5, 3);
  });

  it("flashes then fades, and never flashes with reduced motion", () => {
    expect(flashAlpha(0, false)).toBeGreaterThan(0.5);
    expect(flashAlpha(3, false)).toBe(0);
    expect(flashAlpha(0, true)).toBe(0);
  });
});
