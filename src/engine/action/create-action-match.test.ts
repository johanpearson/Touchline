import { describe, expect, it } from "vitest";
import { aMatchInputV2 } from "./action-builders";
import { createActionMatch } from "./create-action-match";

describe("createActionMatch (stub)", () => {
  it("stays at kickoff with an empty log however far it is advanced", () => {
    const match = createActionMatch(aMatchInputV2().build(), 1);

    match.advanceTo(5400);

    expect(match.events).toEqual([]);
    expect(match.state).toEqual({
      time: 0,
      period: "firstHalf",
      possession: "home",
      ball: { x: 52.5, y: 34 },
      score: { home: 0, away: 0 },
    });
  });

  it("rejects a time that is not finite", () => {
    const match = createActionMatch(aMatchInputV2().build(), 1);

    expect(() => match.advanceTo(Number.NaN)).toThrow(RangeError);
  });

  it("records applied changes", () => {
    const match = createActionMatch(aMatchInputV2().build(), 1);
    const change = { side: "home" as const };

    match.applyChange(change);

    expect(match.changes).toEqual([{ time: 0, change }]);
  });

  it("cannot resume because it is never at half-time", () => {
    const match = createActionMatch(aMatchInputV2().build(), 1);

    expect(() => match.resume()).toThrow("Cannot resume from firstHalf");
  });
});
