import { describe, expect, it } from "vitest";
import { aMatchInput } from "./action/action-builders";
import { createActionMatch } from "./action/create-action-match";
import { createMatch } from "./create-match";
import { createPhaseMatch } from "./phase/create-phase-match";

const v2 = aMatchInput().build();
const v3 = { ...v2, engineVersion: 3 as const };

describe("createMatch", () => {
  it("plays engine 2 inputs on the action engine and exposes no steps", () => {
    const match = createMatch(v2, 5, { detail: "fast" });
    const reference = createActionMatch(v2, 5, { detail: "fast" });
    match.advanceTo(10_000);
    reference.advanceTo(10_000);

    expect(match.events).toEqual(reference.events);
    expect(match.state).toEqual(reference.state);
    expect(match.steps).toEqual([]);
  });

  it("plays engine 3 inputs on the phase engine and exposes the steps", () => {
    const match = createMatch(v3, 5, { detail: "fast" });
    const reference = createPhaseMatch(v3, 5, { detail: "fast" });
    match.advanceTo(10_000);
    reference.advanceTo(10_000);

    expect(match.steps.length).toBeGreaterThan(100);
    expect(match.steps).toEqual(reference.steps);
    expect(match.events).toEqual(reference.events);
  });

  it("keeps the action engine's second half working through the shared API", () => {
    const match = createMatch(v2, 5, { detail: "fast" });
    match.advanceTo(10_000);
    match.resume();
    match.advanceTo(20_000);

    expect(match.state.period).toBe("fullTime");
  });
});
