import { describe, expect, it } from "vitest";
import { FORMATIONS } from "./formation";
import { formationShape } from "./formation-shape";

describe("formationShape", () => {
  it("gives the outfield line counts of a formation", () => {
    expect(formationShape("4-3-3")).toEqual({ defenders: 4, midfielders: 3, forwards: 3 });
    expect(formationShape("3-5-2")).toEqual({ defenders: 3, midfielders: 5, forwards: 2 });
  });

  it.each(FORMATIONS)("leaves ten outfield players for %s", (formation) => {
    const { defenders, midfielders, forwards } = formationShape(formation);
    expect(defenders + midfielders + forwards).toBe(10);
  });
});
