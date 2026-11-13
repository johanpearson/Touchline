import { describe, expect, it } from "vitest";
import { advanceClock, SPEEDS } from "./playback";

describe("advanceClock", () => {
  it("moves match time forward by the wall time times the speed", () => {
    expect(advanceClock(100, 0.5, 60, false)).toBe(130);
  });

  it("keeps the time while paused", () => {
    expect(advanceClock(100, 0.5, 60, true)).toBe(100);
  });

  it("offers increasing speeds", () => {
    expect([...SPEEDS]).toEqual([...SPEEDS].sort((a, b) => a - b));
    expect(SPEEDS.length).toBeGreaterThan(1);
  });
});
