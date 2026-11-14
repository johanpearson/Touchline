import { describe, expect, it } from "vitest";
import { createRng } from "../rng";
import { chooseOption } from "./choose-option";

const scripted = (value: number) => {
  const calls: number[] = [];
  return {
    calls,
    rng: {
      ...createRng(1),
      next: () => {
        calls.push(value);
        return value;
      },
    },
  };
};
const options = [
  { name: "a", weight: 1 },
  { name: "b", weight: 3 },
  { name: "c", weight: 0 },
];

describe("chooseOption", () => {
  it("draws exactly once", () => {
    const { rng, calls } = scripted(0.5);
    chooseOption(options, rng);
    expect(calls).toHaveLength(1);
  });

  it("picks by cumulative weight", () => {
    expect(chooseOption(options, scripted(0.1).rng).name).toBe("a");
    expect(chooseOption(options, scripted(0.3).rng).name).toBe("b");
    expect(chooseOption(options, scripted(0.99).rng).name).toBe("b");
  });

  it("never picks a zero-weight option", () => {
    expect(chooseOption([{ weight: 0 }, { weight: 1 }], scripted(0).rng).weight).toBe(1);
  });

  it("gives the same choice for the same weights and RNG state", () => {
    const first = chooseOption(options, createRng(7));
    expect(chooseOption(options, createRng(7))).toBe(first);
  });

  it("returns the first option when every weight is zero and throws on an empty list", () => {
    expect(chooseOption([{ weight: 0 }, { weight: 0 }], scripted(0.5).rng)).toEqual({ weight: 0 });
    expect(() => chooseOption([], createRng(1))).toThrow(RangeError);
  });
});
