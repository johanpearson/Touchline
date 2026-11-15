import { describe, expect, it } from "vitest";
import { NEUTRAL_TACTICS } from "../tactics";
import { between, playWith, withTactics } from "./balance-test-support";

describe("balance test support", () => {
  it("overrides only the given tactic settings", () => {
    expect(withTactics({ pressing: "high" })).toEqual({ ...NEUTRAL_TACTICS, pressing: "high" });
  });

  it("accepts a value inside the range and rejects one outside it", () => {
    expect(() => between(2.5, 2.4, 3)).not.toThrow();
    expect(() => between(3.5, 2.4, 3)).toThrow();
  });

  it("plays the requested number of matches with the given home tactics", () => {
    const s = playWith(withTactics({ tempo: "fast" }), 2);

    expect(s.matches).toBe(2);
  });
});
