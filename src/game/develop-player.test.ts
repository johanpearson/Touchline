import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { createRng } from "../engine";
import { declineRate, developPlayer, growthShare, playingTimeFactor } from "./develop-player";
import * as constants from "./development-constants";
import { aPlayer } from "./game-builders";
import { ATTRIBUTE_NAMES, MAX_ATTRIBUTE, MIN_ATTRIBUTE, type Player } from "./player";
import { playerOverall } from "./player-overall";

const SEEDS = Array.from({ length: 200 }, (_, i) => i);
const develop = (player: Player, minutes: number, seed: number) =>
  developPlayer(player, minutes, createRng(seed));
const sum = (player: Player): number => ATTRIBUTE_NAMES.reduce((s, n) => s + player[n], 0);

describe("development constants", () => {
  it("pins the curve", () => {
    expect(constants.MINUTES_LOW).toBe(450);
    expect(constants.MINUTES_HIGH).toBe(1800);
    expect(constants.GROWTH_FACTOR_LOW).toBe(0.5);
    expect(constants.GROWTH_FACTOR_HIGH).toBe(1.25);
    expect(constants.MAX_CHANGE_PER_SEASON).toBe(3);
    expect(constants.GROWTH_MAX_AGE).toBe(24);
    expect(constants.PLATEAU_MAX_AGE).toBe(29);
    expect(constants.GROWTH_SHARES).toEqual([
      { maxAge: 17, share: 0.3 },
      { maxAge: 21, share: 0.35 },
      { maxAge: 24, share: 0.2 },
    ]);
    expect(constants.PLATEAU_UP_CHANCE).toBe(0.2);
    expect(constants.PLATEAU_DOWN_CHANCE).toBe(0.2);
    expect(constants.DECLINE_PHYSICAL).toEqual({ base: 0.4, step: 0.25 });
    expect(constants.DECLINE_TECHNICAL).toEqual({ base: 0.1, step: 0.12 });
    expect(constants.PHYSICAL_ATTRIBUTES).toEqual(["pace", "strength", "workRate"]);
    expect(constants.KEEPER_ATTRIBUTES).toEqual(["handling", "reflexes"]);
  });
});

describe("playingTimeFactor", () => {
  it.each([
    [0, 0.5],
    [450, 0.5],
    [1125, 0.875],
    [1800, 1.25],
    [3000, 1.25],
  ])("gives %d minutes the factor %d", (minutes, factor) => {
    expect(playingTimeFactor(minutes)).toBeCloseTo(factor, 10);
  });
});

describe("growthShare and declineRate", () => {
  it.each([
    [16, 0.3],
    [17, 0.3],
    [18, 0.35],
    [21, 0.35],
    [22, 0.2],
    [24, 0.2],
    [25, 0],
  ])("closes %d of the gap by age %d", (age, share) => {
    expect(growthShare(age)).toBe(share);
  });

  it("declines physical attributes faster than technical ones, more each year, from 30", () => {
    expect(declineRate(29, true)).toBe(0);
    expect(declineRate(30, true)).toBeCloseTo(0.4, 10);
    expect(declineRate(32, true)).toBeCloseTo(0.9, 10);
    expect(declineRate(30, false)).toBeCloseTo(0.1, 10);
    expect(declineRate(32, false)).toBeCloseTo(0.34, 10);
  });
});

describe("developPlayer", () => {
  it("makes the player a year older", () => {
    expect(develop(aPlayer().withAge(22).build(), 900, 1).player.age).toBe(23);
  });

  it("is deterministic for a seed and does not change its input", () => {
    const player = Object.freeze(aPlayer().withAge(19).withAllAttributes(8).build());

    expect(develop(player, 900, 5)).toEqual(develop(player, 900, 5));
  });

  it("never lowers an attribute up to 24 and moves towards potential", () => {
    for (const seed of SEEDS) {
      const player = aPlayer().withAge(19).withAllAttributes(8).withPotential(16).build();
      const { player: after } = develop(player, 1800, seed);
      for (const name of ATTRIBUTE_NAMES) expect(after[name]).toBeGreaterThanOrEqual(player[name]);
    }
    const grown = develop(
      aPlayer().withAge(19).withAllAttributes(8).withPotential(16).build(),
      1800,
      1,
    );
    expect(sum(grown.player)).toBeGreaterThan(sum(aPlayer().withAllAttributes(8).build()));
  });

  it("changes a plateau player by at most 1 per attribute", () => {
    for (const seed of SEEDS) {
      const player = aPlayer().withAge(27).withAllAttributes(10).build();
      const { changes } = develop(player, 900, seed);
      for (const change of changes) expect(Math.abs(change.after - change.before)).toBe(1);
    }
  });

  it("declines from 30, physical attributes first and faster", () => {
    let physical = 0;
    let technical = 0;
    for (const seed of SEEDS) {
      const player = aPlayer().withAge(33).withAllAttributes(14).build();
      const { player: after } = develop(player, 900, seed);
      for (const name of ATTRIBUTE_NAMES) expect(after[name]).toBeLessThanOrEqual(14);
      physical += 14 - after.pace;
      technical += 14 - after.passing;
    }
    expect(physical).toBeGreaterThan(technical);
  });

  it("never changes an attribute by more than 3", () => {
    for (const seed of SEEDS) {
      for (const age of [16, 20, 24, 35, 39]) {
        const player = aPlayer().withAge(age).withAllAttributes(5).withPotential(20).build();
        for (const change of develop(player, 1800, seed).changes) {
          expect(Math.abs(change.after - change.before)).toBeLessThanOrEqual(3);
        }
      }
    }
  });

  it("never lets the overall pass potential", () => {
    for (const seed of SEEDS) {
      const player = aPlayer().withAge(18).withAllAttributes(10).withPotential(11).build();
      const { player: after } = develop(player, 1800, seed);
      expect(playerOverall(after)).toBeLessThanOrEqual(11);
    }
  });

  it("lets a player with 1,800 minutes grow at least as much as one with under 450", () => {
    for (const seed of SEEDS) {
      const player = aPlayer().withAge(18).withAllAttributes(6).withPotential(20).build();
      const busy = develop(player, 1800, seed).player;
      const idle = develop(player, 300, seed).player;
      expect(sum(busy)).toBeGreaterThanOrEqual(sum(idle));
      for (const name of ATTRIBUTE_NAMES) expect(busy[name]).toBeGreaterThanOrEqual(idle[name]);
    }
  });

  it("does not let playing time slow a decline", () => {
    for (const seed of SEEDS) {
      const player = aPlayer().withAge(34).withAllAttributes(14).build();
      expect(develop(player, 0, seed).player).toEqual(develop(player, 2700, seed).player);
    }
  });

  it("develops goalkeepers on handling and reflexes only", () => {
    const keeper = aPlayer().withPosition("GK").withAge(19).withAllAttributes(8).withPotential(16);
    const after = develop(keeper.build(), 1800, 3).player;

    expect(after.handling).toBeGreaterThan(8);
    for (const name of ATTRIBUTE_NAMES) {
      if (name !== "handling" && name !== "reflexes") expect(after[name]).toBe(8);
    }
  });

  it("keeps the keeper attributes of outfield players", () => {
    for (const seed of SEEDS) {
      const player = aPlayer().withAge(19).withAllAttributes(8).withPotential(16).build();
      const after = develop(player, 1800, seed).player;
      expect(after.handling).toBe(8);
      expect(after.reflexes).toBe(8);
    }
  });

  it("lists every changed attribute with before and after", () => {
    const player = aPlayer().withId("x").withAge(19).withAllAttributes(8).withPotential(16).build();
    const { player: after, changes } = develop(player, 1800, 2);

    expect(changes.length).toBeGreaterThan(0);
    for (const change of changes) {
      expect(change.playerId).toBe("x");
      expect(change.before).toBe(player[change.attribute]);
      expect(change.after).toBe(after[change.attribute]);
    }
    expect(changes).toHaveLength(ATTRIBUTE_NAMES.filter((n) => after[n] !== player[n]).length);
  });

  it("keeps every attribute an integer from 1 to 20 for any player", () => {
    const attribute = fc.integer({ min: MIN_ATTRIBUTE, max: MAX_ATTRIBUTE });
    fc.assert(
      fc.property(
        fc.integer({ min: 15, max: 40 }),
        fc.constantFrom("GK", "DEF", "MID", "FWD"),
        fc.integer({ min: MIN_ATTRIBUTE, max: MAX_ATTRIBUTE }),
        fc.array(attribute, { minLength: 12, maxLength: 12 }),
        fc.integer({ min: 0, max: 4000 }),
        fc.integer(),
        (age, position, potential, values, minutes, seed) => {
          const base = aPlayer().withAge(age).withPosition(position).withPotential(potential);
          const player: Player = {
            ...base.build(),
            ...Object.fromEntries(ATTRIBUTE_NAMES.map((n, i) => [n, values[i]])),
          };
          const { player: after } = develop(player, minutes, seed);
          for (const name of ATTRIBUTE_NAMES) {
            expect(Number.isInteger(after[name])).toBe(true);
            expect(after[name]).toBeGreaterThanOrEqual(MIN_ATTRIBUTE);
            expect(after[name]).toBeLessThanOrEqual(MAX_ATTRIBUTE);
          }
          if (playerOverall(player) <= potential) {
            expect(playerOverall(after)).toBeLessThanOrEqual(potential);
          }
        },
      ),
    );
  });
});
