import { describe, expect, it } from "vitest";
import { addSquadPlanAndCondition } from "./add-squad-plan";
import { aCareer, deepFreeze } from "./career-builders";
import { parseCareer } from "./parse-career";

const asV2 = (): Record<string, unknown> => {
  const { squadPlan: _plan, condition: _condition, ...v2 } = aCareer();
  return JSON.parse(JSON.stringify(v2));
};

describe("addSquadPlanAndCondition", () => {
  it("gives a v2 career the 4-4-2 best-eleven plan, neutral tactics and full condition", () => {
    const upgraded = addSquadPlanAndCondition(asV2());

    expect(upgraded).toEqual(JSON.parse(JSON.stringify(aCareer())));
    expect(parseCareer(upgraded).ok).toBe(true);
  });

  it("does not mutate its input", () => {
    const v2 = deepFreeze(asV2());
    expect(() => addSquadPlanAndCondition(v2)).not.toThrow();
  });

  it("leaves data it cannot read unchanged, so parseCareer rejects it later", () => {
    expect(addSquadPlanAndCondition("nonsense")).toBe("nonsense");
    const broken = { ...asV2(), league: "x" };
    expect(addSquadPlanAndCondition(broken)).toEqual(broken);
  });
});
