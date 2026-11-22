import { describe, expect, it } from "vitest";
import { createRng, type Rng } from "../rng";
import { spreadTimes } from "./step-times";

const counting = (): Rng & { draws: () => number } => {
  const base = createRng(1);
  let draws = 0;
  return { ...base, next: () => (draws++, base.next()), draws: () => draws };
};

describe("spreadTimes", () => {
  it("gives a single event the start time and draws nothing", () => {
    const rng = counting();

    expect(spreadTimes(1, 100, 120, rng)).toEqual([100]);
    expect(spreadTimes(0, 100, 120, rng)).toEqual([100]);
    expect(rng.draws()).toBe(0);
  });

  it("opens at the start and closes at the end", () => {
    expect(spreadTimes(2, 100, 118.4, createRng(2))).toEqual([100, 118.4]);
  });

  it("spreads the events in between in order, to one decimal, within the step", () => {
    const rng = counting();
    const times = spreadTimes(8, 50, 70, rng);

    expect(times).toHaveLength(8);
    expect(times[0]).toBe(50);
    expect(times[7]).toBe(70);
    expect([...times]).toEqual([...times].sort((a, b) => a - b));
    for (const t of times.slice(1, -1)) {
      expect(t).toBeGreaterThanOrEqual(50);
      expect(t).toBeLessThanOrEqual(70);
      expect(Math.round(t * 10) / 10).toBe(t);
    }
    expect(rng.draws()).toBe(6);
  });

  it("maps a draw to its place in the step", () => {
    const fixed: Rng = { ...createRng(1), next: () => 0.5 };

    expect(spreadTimes(3, 10, 30, fixed)).toEqual([10, 20, 30]);
  });
});
