import { describe, expect, it } from "vitest";
import { aMatchInputV2, anEnginePlayer } from "./action-builders";
import { applyChangeToInput } from "./apply-change-to-input";

describe("applyChangeToInput", () => {
  it("moves a substitute from the bench into the starting eleven", () => {
    const input = aMatchInputV2().build();
    const sub = anEnginePlayer("h-b1").withPosition("MID").build();
    const lineup = input.home.starters.map((p, i) => (i === 5 ? sub : p));

    const result = applyChangeToInput(input, { side: "home", lineup });

    expect(result.ok && result.input.home.starters[5]).toEqual(sub);
    expect(result.ok && result.input.home.bench).toEqual([]);
    expect(result.ok && result.input.away).toBe(input.away);
  });

  it("does not mutate the input and keeps unchanged parts", () => {
    const input = aMatchInputV2().build();
    const tactics = { ...input.home.tactics, pressing: "high" } as const;

    const result = applyChangeToInput(input, { side: "home", tactics });

    expect(input.home.tactics).not.toEqual(tactics);
    expect(result.ok && result.input.home.tactics).toEqual(tactics);
    expect(result.ok && result.input.home.starters).toBe(input.home.starters);
  });
});
