import * as fc from "fast-check";
import { describe, expect, it } from "vitest";
import { aMatchInput } from "./action-builders";
import { arbSeed, propertyRuns } from "./arbitraries";
import { createActionMatch } from "./create-action-match";
import { toPhases } from "./to-phases";

const play = (seed: number) => {
  const match = createActionMatch(aMatchInput().build(), seed, { detail: "fast" });
  match.advanceTo(1_000_000);
  match.resume();
  match.advanceTo(1_000_000);
  return match.events;
};

describe("toPhases properties", () => {
  it("puts every action in exactly one phase, in order, within one period", () => {
    fc.assert(
      fc.property(arbSeed, (seed) => {
        const events = play(seed);
        const phases = toPhases(events);
        const flat = phases.flatMap((p) => p.actions);
        expect(flat).toEqual(events.map((_, i) => i));
        for (const phase of phases) {
          expect(phase.actions.every((i) => events[i]?.period === phase.period)).toBe(true);
        }
      }),
      { numRuns: propertyRuns(5) },
    );
  });

  it("keeps goals, shots and xG of the log", () => {
    fc.assert(
      fc.property(arbSeed, (seed) => {
        const events = play(seed);
        const phases = toPhases(events);
        const shots = events.filter((e) => e.type === "shot");
        const inPhases = phases.flatMap((p) => p.actions.map((i) => events[i]));
        const phaseShots = inPhases.filter((e) => e?.type === "shot");
        expect(phaseShots).toEqual(shots);
        expect(phases.filter((p) => p.outcome === "goal").length).toBe(
          shots.filter((e) => e.outcome === "goal").length,
        );
      }),
      { numRuns: propertyRuns(5) },
    );
  });

  it("is deterministic", () => {
    const events = play(7);
    expect(toPhases(events)).toEqual(toPhases(events));
  });
});
