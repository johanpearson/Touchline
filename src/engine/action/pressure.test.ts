import { describe, expect, it } from "vitest";
import { pressureOn } from "./pressure";

const at = (x: number, y = 34) => ({ x, y });

describe("pressureOn", () => {
  it("is 0 with no opponent within 8 metres", () => {
    expect(pressureOn(at(50), "home", { home: [at(51)], away: [at(58), at(30)] })).toBe(0);
  });

  it("counts only the opponents, not the side's own players", () => {
    expect(pressureOn(at(50), "home", { home: [at(51), at(52)], away: [] })).toBe(0);
  });

  it("is a quarter for one opponent 4 metres away", () => {
    expect(pressureOn(at(50), "home", { home: [], away: [at(54)] })).toBeCloseTo(0.25, 10);
  });

  it("adds up several opponents and uses the other side's shape for the away side", () => {
    expect(pressureOn(at(50), "away", { home: [at(54), at(50, 38)], away: [at(51)] })).toBeCloseTo(
      0.5,
      10,
    );
  });

  it("saturates at 1", () => {
    expect(pressureOn(at(50), "home", { home: [], away: [at(50), at(51), at(52)] })).toBe(1);
  });
});
