import { describe, expect, it } from "vitest";
import { createRng } from "../engine";
import { generatePlayer } from "./generate-player";
import { ATTRIBUTE_NAMES, MAX_ATTRIBUTE, MIN_ATTRIBUTE, type PlayerAttributes } from "./player";
import type { PlayerPosition } from "./squad-player";

const POSITIONS: PlayerPosition[] = ["GK", "DEF", "MID", "FWD"];

const meanAttributes = (position: PlayerPosition, quality = 0.5): PlayerAttributes => {
  const rng = createRng(11);
  const totals = Object.fromEntries(ATTRIBUTE_NAMES.map((a) => [a, 0])) as PlayerAttributes;
  const n = 200;
  for (let i = 0; i < n; i++) {
    const player = generatePlayer({ position, quality }, rng, `p${i}`);
    for (const a of ATTRIBUTE_NAMES) totals[a] += player[a] / n;
  }
  return totals;
};

describe("generatePlayer", () => {
  it("returns a player with the given id and position", () => {
    const player = generatePlayer({ position: "DEF", quality: 0.5 }, createRng(1), "kvarnby-3");
    expect(player.id).toBe("kvarnby-3");
    expect(player.position).toBe("DEF");
    expect(player.name.length).toBeGreaterThan(3);
  });

  it("clamps every attribute to an integer between 1 and 20", () => {
    for (const quality of [0, 0.5, 1]) {
      for (const position of POSITIONS) {
        const rng = createRng(5);
        for (let i = 0; i < 100; i++) {
          const player = generatePlayer({ position, quality }, rng, "p");
          for (const a of ATTRIBUTE_NAMES) {
            expect(Number.isInteger(player[a])).toBe(true);
            expect(player[a]).toBeGreaterThanOrEqual(MIN_ATTRIBUTE);
            expect(player[a]).toBeLessThanOrEqual(MAX_ATTRIBUTE);
          }
        }
      }
    }
  });

  it("uses the given age and otherwise picks one between 17 and 36", () => {
    expect(generatePlayer({ position: "MID", quality: 0.5, age: 30 }, createRng(1), "p").age).toBe(
      30,
    );
    const rng = createRng(2);
    for (let i = 0; i < 100; i++) {
      const { age } = generatePlayer({ position: "MID", quality: 0.5 }, rng, "p");
      expect(age).toBeGreaterThanOrEqual(17);
      expect(age).toBeLessThanOrEqual(36);
    }
  });

  it("is deterministic for the same seed", () => {
    const make = () => generatePlayer({ position: "FWD", quality: 0.7 }, createRng(9), "p");
    expect(make()).toEqual(make());
  });

  it("gives higher quality a higher mean attribute", () => {
    const mean = (q: number) => {
      const m = meanAttributes("MID", q);
      return ATTRIBUTE_NAMES.reduce((s, a) => s + m[a], 0);
    };
    expect(mean(0.2)).toBeLessThan(mean(0.5));
    expect(mean(0.5)).toBeLessThan(mean(0.8));
  });

  it("gives forwards better finishing than defenders at the same quality", () => {
    expect(meanAttributes("FWD").finishing).toBeGreaterThan(meanAttributes("DEF").finishing + 3);
  });

  it("gives defenders better tackling and positioning than forwards", () => {
    const def = meanAttributes("DEF");
    const fwd = meanAttributes("FWD");
    expect(def.tackling).toBeGreaterThan(fwd.tackling + 3);
    expect(def.positioning).toBeGreaterThan(fwd.positioning + 3);
  });

  it("gives goalkeepers strong handling and reflexes and weak outfield attributes", () => {
    const gk = meanAttributes("GK");
    expect(gk.handling).toBeGreaterThan(11);
    expect(gk.reflexes).toBeGreaterThan(11);
    for (const a of ["passing", "dribbling", "pace", "finishing", "tackling"] as const) {
      expect(gk[a]).toBeLessThan(6);
    }
  });

  it("gives outfield players low handling and reflexes", () => {
    for (const position of ["DEF", "MID", "FWD"] as const) {
      const m = meanAttributes(position);
      expect(m.handling).toBeLessThan(5);
      expect(m.reflexes).toBeLessThan(5);
    }
  });
});
