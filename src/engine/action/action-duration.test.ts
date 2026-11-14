import { describe, expect, it } from "vitest";
import { createRng } from "../rng";
import { actionDuration } from "./action-duration";

const scripted = (value: number) => ({ ...createRng(1), next: () => value });

describe("actionDuration", () => {
  it("is 2 to 4 seconds for every type, tempo and draw", () => {
    for (const type of ["pass", "carry", "shot", "tackle", "interception", "clearance"] as const) {
      for (const tempo of ["slow", "normal", "fast"] as const) {
        for (const u of [0, 0.25, 0.5, 0.75, 0.9999]) {
          const d = actionDuration(type, tempo, scripted(u));
          expect(d).toBeGreaterThanOrEqual(2);
          expect(d).toBeLessThanOrEqual(4);
        }
      }
    }
  });

  it("maps the draw linearly onto 2 to 4 seconds at normal tempo", () => {
    expect(actionDuration("pass", "normal", scripted(0))).toBe(2);
    expect(actionDuration("pass", "normal", scripted(0.5))).toBe(3);
  });

  it("is shorter at fast tempo and longer at slow tempo for the same draw", () => {
    const normal = actionDuration("pass", "normal", scripted(0.5));
    expect(actionDuration("pass", "fast", scripted(0.5))).toBeLessThan(normal);
    expect(actionDuration("pass", "slow", scripted(0.5))).toBeGreaterThan(normal);
  });

  it("uses exactly one random draw and rounds to one decimal", () => {
    let calls = 0;
    const rng = {
      ...createRng(1),
      next: () => {
        calls++;
        return 0.123456;
      },
    };
    const d = actionDuration("carry", "normal", rng);
    expect(calls).toBe(1);
    expect(Math.round(d * 10) / 10).toBe(d);
  });
});
