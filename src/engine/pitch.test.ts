import { describe, expect, it } from "vitest";
import { opponentOf, progressOf, xAtProgress } from "./pitch";

describe("pitch geometry", () => {
  it("measures progress towards the away goal for the home side", () => {
    expect(progressOf("home", 0.8)).toBeCloseTo(0.8);
  });

  it("measures progress towards the home goal for the away side", () => {
    expect(progressOf("away", 0.8)).toBeCloseTo(0.2);
  });

  it("converts progress back to an x coordinate for each side", () => {
    expect(xAtProgress("home", 0.7)).toBeCloseTo(0.7);
    expect(xAtProgress("away", 0.7)).toBeCloseTo(0.3);
  });

  it("returns the other side as opponent", () => {
    expect(opponentOf("home")).toBe("away");
    expect(opponentOf("away")).toBe("home");
  });
});
