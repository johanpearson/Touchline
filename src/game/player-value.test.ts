import { describe, expect, it } from "vitest";
import { aPlayer } from "./game-builders";
import { playerValue, wageFor } from "./player-value";

const player = (overall: number, potential: number, age: number) =>
  aPlayer().withAllAttributes(overall).withPotential(potential).withAge(age).build();

describe("playerValue", () => {
  it("is 1000 for a skill of 10 at a prime age with a long contract", () => {
    expect(playerValue(player(10, 10, 26), { expiresSeason: 3 }, 1)).toBe(1000);
  });

  it("doubles every two skill points", () => {
    expect(playerValue(player(12, 12, 26), { expiresSeason: 3 }, 1)).toBe(2000);
    expect(playerValue(player(14, 14, 26), { expiresSeason: 3 }, 1)).toBe(4000);
  });

  it("counts half of the gap to the potential as skill", () => {
    expect(playerValue(player(10, 16, 20), { expiresSeason: 3 }, 1)).toBe(2828);
    expect(playerValue(player(10, 16, 20), { expiresSeason: 3 }, 1)).toBeGreaterThan(
      playerValue(player(10, 10, 20), { expiresSeason: 3 }, 1),
    );
  });

  it("falls with age from 26 and is near zero at 35", () => {
    const at = (age: number) => playerValue(player(10, 10, age), { expiresSeason: 3 }, 1);
    expect(at(30)).toBe(556);
    expect(at(34)).toBe(111);
    expect(at(35)).toBe(20);
    expect(at(40)).toBe(20);
  });

  it("falls by 15% for every contract season below three", () => {
    const at = (expiresSeason: number) => playerValue(player(10, 10, 26), { expiresSeason }, 1);
    expect([at(1), at(2), at(3), at(5)]).toEqual([700, 850, 1000, 1000]);
  });

  it("counts remaining seasons from the current season", () => {
    expect(playerValue(player(10, 10, 26), { expiresSeason: 4 }, 4)).toBe(700);
    expect(playerValue(player(10, 10, 26), { expiresSeason: 3 }, 4)).toBe(550);
  });

  it("never counts a potential below the overall", () => {
    expect(playerValue(player(12, 8, 26), { expiresSeason: 3 }, 1)).toBe(2000);
  });
});

describe("wageFor", () => {
  it("is a fifth of the value, rounded", () => {
    expect(wageFor(1000)).toBe(200);
    expect(wageFor(2828)).toBe(566);
    expect(wageFor(0)).toBe(0);
  });
});
