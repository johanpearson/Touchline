import { describe, expect, it } from "vitest";
import { shotXg } from "./xg";

describe("shotXg", () => {
  it("gives a closer shot a higher value than a distant one", () => {
    expect(shotXg(0.95, 0.5)).toBeGreaterThan(shotXg(0.8, 0.5));
  });

  it("gives a central shot a higher value than one from the wing", () => {
    expect(shotXg(0.9, 0.5)).toBeGreaterThan(shotXg(0.9, 0.05));
  });

  it("stays between 0 and 1 across the attacking third", () => {
    for (const progress of [0.77, 0.85, 0.97, 1]) {
      for (const y of [0, 0.25, 0.5, 0.75, 1]) {
        const xg = shotXg(progress, y);
        expect(xg).toBeGreaterThan(0);
        expect(xg).toBeLessThan(1);
      }
    }
  });
});
