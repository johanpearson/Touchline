import { describe, expect, it } from "vitest";
import { combinationsFor, labelOf, MENTALITIES, PRESSINGS } from "./tactic-combinations";

describe("tactic combinations", () => {
  it("covers all 81 distinct combinations of settings across the three mentalities and three pressing levels", () => {
    const labels = MENTALITIES.flatMap((m) => PRESSINGS.flatMap((p) => combinationsFor(m, p))).map(
      labelOf,
    );

    expect(labels).toHaveLength(81);
    expect(new Set(labels).size).toBe(81);
  });

  it("keeps mentality and pressing fixed within one group of 9", () => {
    const group = combinationsFor("attacking", "high");

    expect(group).toHaveLength(9);
    expect(group.every((t) => t.mentality === "attacking" && t.pressing === "high")).toBe(true);
  });

  it("labels a combination with its four settings", () => {
    expect(labelOf({ mentality: "balanced", pressing: "high", width: "wide", tempo: "slow" })).toBe(
      "balanced/high/wide/slow",
    );
  });
});
