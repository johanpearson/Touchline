import { describe, expect, it } from "vitest";
import { NEUTRAL_TACTICS, type TeamTactics } from "../tactics";
import { PRESSURE_RADIUS } from "./shape-constants";
import { actionTactics, isCentralShot } from "./tactics-parameters";

const t = (extra: Partial<TeamTactics>): TeamTactics => ({ ...NEUTRAL_TACTICS, ...extra });

describe("actionTactics", () => {
  it("adds zero and multiplies by one for the neutral tactics", () => {
    expect(actionTactics(NEUTRAL_TACTICS)).toEqual({
      directness: 0,
      risk: 1,
      shotWeight: 1,
      wideBonus: 1,
      centralShot: 1,
      tempoExponent: 1,
      passSuccess: 0,
      lineHeight: 0,
      compactness: 1,
      width: 1,
      pressRadius: PRESSURE_RADIUS,
      turnoverBonus: 0,
      spaceBehind: 1,
    });
  });

  it("makes high pressing push the line up, widen the trigger distance and win more balls but leave space", () => {
    const high = actionTactics(t({ pressing: "high" }));
    const low = actionTactics(t({ pressing: "low" }));
    expect(high.lineHeight).toBeGreaterThan(0);
    expect(high.pressRadius).toBeGreaterThan(PRESSURE_RADIUS);
    expect(high.turnoverBonus).toBeGreaterThan(0);
    expect(high.spaceBehind).toBeGreaterThan(1);
    expect(low.lineHeight).toBeLessThan(0);
    expect(low.pressRadius).toBeLessThan(PRESSURE_RADIUS);
    expect(low.turnoverBonus).toBeLessThan(0);
    expect(low.spaceBehind).toBeLessThan(1);
  });

  it("makes wide raise the cross share and lower central shots, and narrow the opposite", () => {
    const wide = actionTactics(t({ width: "wide" }));
    const narrow = actionTactics(t({ width: "narrow" }));
    expect(wide.wideBonus).toBeGreaterThan(1);
    expect(wide.centralShot).toBeLessThan(1);
    expect(wide.width).toBeGreaterThan(1);
    expect(narrow.wideBonus).toBeLessThan(1);
    expect(narrow.centralShot).toBeGreaterThan(1);
    expect(narrow.width).toBeLessThan(1);
  });

  it("makes fast tempo shorten actions and lower pass success, and slow tempo the opposite", () => {
    const fast = actionTactics(t({ tempo: "fast" }));
    const slow = actionTactics(t({ tempo: "slow" }));
    expect(fast.tempoExponent).toBeGreaterThan(1);
    expect(fast.passSuccess).toBeLessThan(0);
    expect(slow.tempoExponent).toBeLessThan(1);
    expect(slow.passSuccess).toBeGreaterThan(0);
  });

  it("makes attacking mentality raise shot and risk weights and lower compactness, defensive the reverse", () => {
    const attacking = actionTactics(t({ mentality: "attacking" }));
    const defensive = actionTactics(t({ mentality: "defensive" }));
    expect(attacking.shotWeight).toBeGreaterThan(1);
    expect(attacking.risk).toBeGreaterThan(1);
    expect(attacking.compactness).toBeGreaterThan(1);
    expect(defensive.shotWeight).toBeLessThan(1);
    expect(defensive.risk).toBeLessThan(1);
    expect(defensive.compactness).toBeLessThan(1);
  });
});

describe("isCentralShot", () => {
  it("is true within 11 m of the middle line and false outside", () => {
    expect(isCentralShot(34, 68)).toBe(true);
    expect(isCentralShot(45, 68)).toBe(true);
    expect(isCentralShot(45.1, 68)).toBe(false);
    expect(isCentralShot(10, 68)).toBe(false);
  });
});
