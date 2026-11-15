import { describe, expect, it } from "vitest";
import { combinationsFor, labelOf, MENTALITIES } from "./tactic-combinations";

describe("tactic combinations", () => {
  it("covers all 81 distinct combinations of settings across the three mentalities", () => {
    const labels = MENTALITIES.flatMap(combinationsFor).map(labelOf);

    expect(labels).toHaveLength(81);
    expect(new Set(labels).size).toBe(81);
  });

  it("keeps the mentality fixed within one group of 27", () => {
    const group = combinationsFor("attacking");

    expect(group).toHaveLength(27);
    expect(group.every((t) => t.mentality === "attacking")).toBe(true);
  });

  it("labels a combination with its four settings", () => {
    expect(labelOf({ mentality: "balanced", pressing: "high", width: "wide", tempo: "slow" })).toBe(
      "balanced/high/wide/slow",
    );
  });
});
