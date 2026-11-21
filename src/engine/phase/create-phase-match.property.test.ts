import * as fc from "fast-check";
import { describe, expect, it, vi } from "vitest";
import { arbMatchInputV2, arbSeed, propertyRuns } from "../action/arbitraries";
import type { MatchInput } from "../action/match-input";
import { createPhaseMatch } from "./create-phase-match";

vi.setConfig({ testTimeout: 120_000 });

const arbInputV3: fc.Arbitrary<MatchInput> = arbMatchInputV2.map((input) => ({
  ...input,
  engineVersion: 3 as const,
}));

const arbSplits = fc.array(fc.integer({ min: 1, max: 900 }), { minLength: 1, maxLength: 12 });

const playWhole = (input: MatchInput, seed: number, detail: "fast" | "full") => {
  const match = createPhaseMatch(input, seed, { detail });
  match.advanceTo(10_000);
  match.resume();
  match.advanceTo(20_000);
  return match;
};

const playSplit = (input: MatchInput, seed: number, splits: readonly number[]) => {
  const match = createPhaseMatch(input, seed, { detail: "fast" });
  let t = 0;
  for (const split of splits) {
    t += split;
    match.advanceTo(t);
  }
  for (let at = t; at < 3300; at += 211) match.advanceTo(at);
  match.advanceTo(10_000);
  match.resume();
  for (let at = 2800; at < 5700; at += 173) match.advanceTo(at);
  match.advanceTo(20_000);
  return match;
};

const assertProperty = (property: fc.IPropertyWithHooks<unknown[]>, runs = 6) =>
  fc.assert(property, { numRuns: propertyRuns(runs), seed: 20_261_121 });

describe("phase match properties", () => {
  it("gives the same steps and score however advanceTo is split", () => {
    assertProperty(
      fc.property(arbInputV3, arbSeed, arbSplits, (input, seed, splits) => {
        const whole = playWhole(input, seed, "fast");
        const split = playSplit(input, seed, splits);

        expect(split.steps).toEqual(whole.steps);
        expect(split.events).toEqual(whole.events);
        expect(split.state).toEqual(whole.state);
      }) as fc.IPropertyWithHooks<unknown[]>,
    );
  });

  it("gives the same steps, score and chances in fast and full detail", () => {
    assertProperty(
      fc.property(arbInputV3, arbSeed, (input, seed) => {
        const fast = playWhole(input, seed, "fast");
        const full = playWhole(input, seed, "full");

        expect(full.steps).toEqual(fast.steps);
        expect(full.state.score).toEqual(fast.state.score);
        expect(full.events.map(({ snapshot: _s, ...rest }) => rest)).toEqual(
          fast.events.map(({ snapshot: _s, ...rest }) => rest),
        );
      }) as fc.IPropertyWithHooks<unknown[]>,
    );
  });

  it("keeps event times in order and inside the match", () => {
    assertProperty(
      fc.property(arbInputV3, arbSeed, (input, seed) => {
        const { events, state } = playWhole(input, seed, "fast");
        const times = events.map((e) => e.time);

        expect(times).toEqual([...times].sort((a, b) => a - b));
        expect(times.at(-1)).toBeLessThanOrEqual(state.time + 1e-6);
        expect(state.period).toBe("fullTime");
      }) as fc.IPropertyWithHooks<unknown[]>,
    );
  });
});
