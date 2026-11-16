import { describe, expect, it } from "vitest";
import { NEUTRAL_TACTICS } from "../engine";
import {
  activeShout,
  applyShout,
  checkShout,
  SHOUT_COOLDOWN_MINUTES,
  SHOUT_DURATION_MINUTES,
  SHOUT_FATIGUE_PER_LEVEL_MINUTE,
  shoutFatigue,
  shoutFatiguePerMinute,
  tacticsAtMinute,
} from "./shouts";

describe("applyShout", () => {
  it("pushes mentality one level up", () => {
    expect(applyShout(NEUTRAL_TACTICS, "pushUp")).toEqual({
      ...NEUTRAL_TACTICS,
      mentality: "attacking",
    });
  });

  it("calms mentality one level down", () => {
    expect(applyShout(NEUTRAL_TACTICS, "calmDown")).toEqual({
      ...NEUTRAL_TACTICS,
      mentality: "defensive",
    });
  });

  it("presses the ball with more pressing and a faster tempo", () => {
    expect(applyShout(NEUTRAL_TACTICS, "pressTheBall")).toEqual({
      ...NEUTRAL_TACTICS,
      pressing: "high",
      tempo: "fast",
    });
  });

  it("holds the shape with less pressing and a slower tempo", () => {
    expect(applyShout(NEUTRAL_TACTICS, "holdShape")).toEqual({
      ...NEUTRAL_TACTICS,
      pressing: "low",
      tempo: "slow",
    });
  });

  it("stops at the last level of a setting and keeps the settings it does not touch", () => {
    const base = { ...NEUTRAL_TACTICS, mentality: "attacking" as const, width: "wide" as const };
    expect(applyShout(base, "pushUp")).toEqual(base);
    expect(applyShout(base, "pressTheBall")).toEqual({ ...base, pressing: "high", tempo: "fast" });
  });
});

describe("tacticsAtMinute", () => {
  const shouts = [{ kind: "pushUp" as const, minute: 20 }];

  it("uses the base before, the shout during and the base after it", () => {
    expect(tacticsAtMinute(NEUTRAL_TACTICS, shouts, 19.9)).toEqual(NEUTRAL_TACTICS);
    expect(tacticsAtMinute(NEUTRAL_TACTICS, shouts, 20).mentality).toBe("attacking");
    expect(
      tacticsAtMinute(NEUTRAL_TACTICS, shouts, 20 + SHOUT_DURATION_MINUTES - 0.1).mentality,
    ).toBe("attacking");
    expect(tacticsAtMinute(NEUTRAL_TACTICS, shouts, 20 + SHOUT_DURATION_MINUTES)).toEqual(
      NEUTRAL_TACTICS,
    );
  });

  it("finds the active shout", () => {
    expect(activeShout(shouts, 25)).toBe(shouts[0]);
    expect(activeShout(shouts, 31)).toBeUndefined();
  });
});

describe("checkShout", () => {
  const first = [{ kind: "pushUp" as const, minute: 20 }];
  const free = 20 + SHOUT_DURATION_MINUTES + SHOUT_COOLDOWN_MINUTES;

  it("accepts a shout with no earlier one", () => {
    expect(checkShout(NEUTRAL_TACTICS, [], "pushUp", 10)).toBeUndefined();
  });

  it("refuses a shout while another is active", () => {
    expect(checkShout(NEUTRAL_TACTICS, first, "calmDown", 25)).toBe("shout-active");
  });

  it("refuses a shout during the cooldown and accepts it afterwards", () => {
    expect(checkShout(NEUTRAL_TACTICS, first, "calmDown", free - 0.1)).toBe("shout-cooling-down");
    expect(checkShout(NEUTRAL_TACTICS, first, "calmDown", free)).toBeUndefined();
  });

  it("refuses a shout that changes nothing", () => {
    const attacking = { ...NEUTRAL_TACTICS, mentality: "attacking" as const };
    const pressing = { ...attacking, pressing: "high" as const, tempo: "fast" as const };
    expect(checkShout(attacking, [], "pushUp", 10)).toBe("shout-no-effect");
    expect(checkShout(pressing, [], "pressTheBall", 10)).toBe("shout-no-effect");
  });

  it("accepts a shout that only changes tempo", () => {
    const base = { ...NEUTRAL_TACTICS, pressing: "high" as const };
    expect(checkShout(base, [], "pressTheBall", 10)).toBeUndefined();
  });
});

describe("shout fatigue", () => {
  it("costs for every level mentality and pressing go up, and nothing for calming down", () => {
    expect(shoutFatiguePerMinute(NEUTRAL_TACTICS, "pushUp")).toBeCloseTo(
      SHOUT_FATIGUE_PER_LEVEL_MINUTE,
    );
    const calm = { ...NEUTRAL_TACTICS, mentality: "defensive" as const, pressing: "low" as const };
    expect(shoutFatiguePerMinute(calm, "pushUp")).toBeCloseTo(SHOUT_FATIGUE_PER_LEVEL_MINUTE);
    expect(shoutFatiguePerMinute(NEUTRAL_TACTICS, "pressTheBall")).toBeCloseTo(
      SHOUT_FATIGUE_PER_LEVEL_MINUTE,
    );
    expect(shoutFatiguePerMinute(NEUTRAL_TACTICS, "calmDown")).toBe(0);
    expect(shoutFatiguePerMinute(NEUTRAL_TACTICS, "holdShape")).toBe(0);
  });

  it("charges only the minutes a player is on the pitch while the shout lasts", () => {
    const shouts = [{ kind: "pushUp" as const, minute: 20 }];
    const perMinute = shoutFatiguePerMinute(NEUTRAL_TACTICS, "pushUp");

    expect(shoutFatigue(NEUTRAL_TACTICS, shouts, 0, 90)).toBeCloseTo(10 * perMinute);
    expect(shoutFatigue(NEUTRAL_TACTICS, shouts, 25, 90)).toBeCloseTo(5 * perMinute);
    expect(shoutFatigue(NEUTRAL_TACTICS, shouts, 0, 20)).toBe(0);
    expect(shoutFatigue(NEUTRAL_TACTICS, shouts, 30, 90)).toBe(0);
  });
});
