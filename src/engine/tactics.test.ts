import { describe, expect, it } from "vitest";
import { createMatch } from "./create-match";
import { aMatchInput } from "./match-builders";
import { NEUTRAL_TACTICS, type TeamTactics, tacticsModifiers } from "./tactics";

const play = (home: TeamTactics, away: TeamTactics, seed: number) => {
  const match = createMatch(
    { ...aMatchInput().build(), homeTactics: home, awayTactics: away },
    seed,
  );
  match.advanceTo(1_000_000);
  match.resume();
  match.advanceTo(1_000_000);
  return match;
};

describe("tacticsModifiers", () => {
  it("is zero or one everywhere for neutral tactics", () => {
    expect(tacticsModifiers(NEUTRAL_TACTICS)).toEqual({
      shootChance: 0,
      concededShootChance: 0,
      advanceChance: 0,
      concededAdvanceChance: 0,
      concededAdvanceStep: 0,
      lateralChance: 0,
      cornerChance: 0,
      shotQuality: 1,
      stepDelay: 1,
    });
  });

  it("makes an attacking team shoot more and concede more chances", () => {
    const m = tacticsModifiers({ ...NEUTRAL_TACTICS, mentality: "attacking" });

    expect(m.shootChance).toBeGreaterThan(0);
    expect(m.concededShootChance).toBeGreaterThan(0);
  });

  it("makes a defensive team shoot less and concede fewer chances", () => {
    const m = tacticsModifiers({ ...NEUTRAL_TACTICS, mentality: "defensive" });

    expect(m.shootChance).toBeLessThan(0);
    expect(m.concededShootChance).toBeLessThan(0);
  });

  it("makes high pressing hurt opponent progress but give them space behind", () => {
    const m = tacticsModifiers({ ...NEUTRAL_TACTICS, pressing: "high" });

    expect(m.concededAdvanceChance).toBeLessThan(0);
    expect(m.concededAdvanceStep).toBeGreaterThan(0);
  });

  it("makes wide play give more lateral moves and corners but lower shot quality", () => {
    const m = tacticsModifiers({ ...NEUTRAL_TACTICS, width: "wide" });

    expect(m.lateralChance).toBeGreaterThan(0);
    expect(m.cornerChance).toBeGreaterThan(0);
    expect(m.shotQuality).toBeLessThan(1);
  });

  it("makes fast tempo shorten step delays and lose the ball more often", () => {
    const m = tacticsModifiers({ ...NEUTRAL_TACTICS, tempo: "fast" });

    expect(m.stepDelay).toBeLessThan(1);
    expect(m.advanceChance).toBeLessThan(0);
  });
});

describe("tactics in a match", () => {
  it("changes the event log when a side uses non-neutral tactics", () => {
    const attacking = { ...NEUTRAL_TACTICS, mentality: "attacking" } as const;

    expect(play(attacking, NEUTRAL_TACTICS, 5).events).not.toEqual(
      play(NEUTRAL_TACTICS, NEUTRAL_TACTICS, 5).events,
    );
  });

  it("gives fast tempo more events than slow tempo with the same seed", () => {
    const fast = play(
      { ...NEUTRAL_TACTICS, tempo: "fast" },
      { ...NEUTRAL_TACTICS, tempo: "fast" },
      9,
    );
    const slow = play(
      { ...NEUTRAL_TACTICS, tempo: "slow" },
      { ...NEUTRAL_TACTICS, tempo: "slow" },
      9,
    );

    expect(fast.events.length).toBeGreaterThan(slow.events.length);
  });
});
