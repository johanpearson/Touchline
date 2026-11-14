import { describe, expect, it } from "vitest";
import { phaseOf } from "./team-phase";

const settled = { type: "pass", actionsSinceTurnover: 10 } as const;

describe("phaseOf", () => {
  it("is setPiece while a restart is taken, even right after a turnover", () => {
    expect(
      phaseOf("home", "home", { x: 50, y: 34 }, { type: "setPiece", actionsSinceTurnover: 0 }),
    ).toBe("setPiece");
  });

  it("is transition for the first three actions after the ball changes side, for both sides", () => {
    const last = { type: "tackle", actionsSinceTurnover: 2 } as const;
    expect(phaseOf("home", "away", { x: 50, y: 34 }, last)).toBe("transition");
    expect(phaseOf("away", "away", { x: 50, y: 34 }, last)).toBe("transition");
    expect(phaseOf("home", "away", { x: 50, y: 34 }, { ...last, actionsSinceTurnover: 3 })).toBe(
      "defending",
    );
  });

  it("is defending for the side without the ball", () => {
    expect(phaseOf("away", "home", { x: 50, y: 34 }, settled)).toBe("defending");
  });

  it.each([
    [{ x: 0, y: 34 }, "buildUp"],
    [{ x: 34.9, y: 34 }, "buildUp"],
    [{ x: 35, y: 34 }, "progression"],
    [{ x: 69.9, y: 34 }, "progression"],
    [{ x: 70, y: 34 }, "attack"],
  ] as const)("gives the home side with the ball at %j the phase %s", (ball, phase) => {
    expect(phaseOf("home", "home", ball, settled)).toBe(phase);
  });

  it("measures the thirds from the away side's own goal line", () => {
    expect(phaseOf("away", "away", { x: 105, y: 34 }, settled)).toBe("buildUp");
    expect(phaseOf("away", "away", { x: 30, y: 34 }, settled)).toBe("attack");
  });
});
