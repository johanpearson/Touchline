import { describe, expect, it } from "vitest";
import { createRng } from "../rng";
import { anEnginePlayer } from "./action-builders";
import { HOME_ADVANTAGE } from "./decision-constants";
import { homeEdge } from "./home-advantage";
import { carryKeptChance } from "./resolve-carry";
import { tackleWinChance } from "./resolve-challenge";
import { passCompletionChance, resolvePass } from "./resolve-pass";

const at = (x: number, y = 34) => ({ x, y });
const p = anEnginePlayer("p").build();
const pass = {
  side: "home",
  passer: p,
  receiverSlot: 1,
  receiver: p,
  variant: "short",
  from: at(50),
  to: at(60),
  pressure: 0.5,
  opponents: [],
} as const;

describe("homeEdge", () => {
  it("gives the home side the named constant and the away side nothing", () => {
    expect(homeEdge("home")).toBe(HOME_ADVANTAGE);
    expect(homeEdge("away")).toBe(0);
  });

  it("gives 0 for both sides when the advantage is 0", () => {
    expect(homeEdge("home", 0)).toBe(0);
    expect(homeEdge("away", 0)).toBe(0);
  });

  it("keeps the constant small and documented", () => {
    expect(HOME_ADVANTAGE).toBeGreaterThan(0);
    expect(HOME_ADVANTAGE).toBeLessThanOrEqual(0.05);
  });
});

describe("home advantage in the resolvers", () => {
  it("raises pass completion by the advantage and gives the unchanged chance at 0", () => {
    const base = passCompletionChance(pass);
    expect(passCompletionChance({ ...pass, advantage: 0 })).toBe(base);
    expect(passCompletionChance({ ...pass, advantage: 0.02 })).toBeCloseTo(base + 0.02, 10);
  });

  it("raises the carry kept chance and the tackle win chance by their bonus", () => {
    const carry = {
      side: "home",
      carrier: p,
      carrierSlot: 1,
      from: at(50),
      to: at(58),
      pressure: 0.4,
    } as const;
    expect(carryKeptChance({ ...carry, keptBonus: 0 })).toBe(carryKeptChance(carry));
    expect(carryKeptChance({ ...carry, keptBonus: 0.02 })).toBeCloseTo(
      carryKeptChance(carry) + 0.02,
      10,
    );
    const tackle = {
      carrierSide: "away",
      carrierSlot: 1,
      carrier: p,
      tacklerSlot: 2,
      tackler: p,
      point: at(40),
      pressure: 0.4,
    } as const;
    expect(tackleWinChance({ ...tackle, advantage: 0 })).toBe(tackleWinChance(tackle));
    expect(tackleWinChance({ ...tackle, advantage: 0.02 })).toBeCloseTo(
      tackleWinChance(tackle) + 0.02,
      10,
    );
  });

  it("resolves a pass exactly as before with an advantage of 0", () => {
    for (const u of [0.1, 0.5, 0.95]) {
      const draws = () => ({ ...createRng(1), next: () => u });
      expect(resolvePass({ ...pass, advantage: 0 }, draws())).toEqual(resolvePass(pass, draws()));
    }
  });

  it("completes a pass that the same draw loses without the advantage", () => {
    const edge = 0.02;
    const chance = passCompletionChance(pass);
    const draw = chance + edge / 2;
    const rng = () => ({ ...createRng(1), next: () => draw });
    expect(resolvePass(pass, rng()).outcome).not.toBe("complete");
    expect(resolvePass({ ...pass, advantage: edge }, rng()).outcome).toBe("complete");
  });
});
