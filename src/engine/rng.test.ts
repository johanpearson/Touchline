import { describe, expect, it } from "vitest";
import { createRng } from "./rng";

const draw = (seed: number, count: number) => {
  const rng = createRng(seed);
  return Array.from({ length: count }, () => rng.next());
};

describe("createRng", () => {
  it("matches known reference values for a forked stream", () => {
    const fork = createRng(1).fork("x");

    expect([fork.next(), fork.next(), fork.next()]).toEqual([
      0.6434926844667643, 0.5489218165166676, 0.12459697690792382,
    ]);
  });

  it("says why an invalid range, empty list or probability was rejected", () => {
    const rng = createRng(1);

    expect(() => rng.int(3, 2)).toThrow("Invalid integer range [3, 2]");
    expect(() => rng.pick([])).toThrow("Cannot pick from an empty list");
    expect(() => rng.chance(1.5)).toThrow("Probability out of range: 1.5");
  });

  it("treats a chance equal to the next draw as a miss", () => {
    const first = createRng(1).next();

    expect(createRng(1).chance(first)).toBe(false);
    expect(createRng(1).chance(first + 1e-9)).toBe(true);
  });

  it("gives the same sequence for the same seed", () => {
    expect(draw(42, 20)).toEqual(draw(42, 20));
  });

  it("gives different sequences for different seeds", () => {
    expect(draw(1, 20)).not.toEqual(draw(2, 20));
  });

  it("returns values in [0, 1)", () => {
    for (const value of draw(7, 10_000)) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it("has a mean close to 0.5 over 100k draws", () => {
    const values = draw(123, 100_000);
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    expect(Math.abs(mean - 0.5)).toBeLessThan(0.005);
  });

  it("spreads draws evenly over ten buckets", () => {
    const buckets = new Array<number>(10).fill(0);
    for (const value of draw(99, 100_000)) {
      const bucket = Math.floor(value * 10);
      buckets[bucket] = (buckets[bucket] ?? 0) + 1;
    }
    for (const count of buckets) expect(Math.abs(count - 10_000)).toBeLessThan(500);
  });

  it("matches known reference values for seed 1 (mulberry32)", () => {
    expect(draw(1, 3)).toEqual([0.6270739405881613, 0.002735721180215478, 0.5274470399599522]);
  });

  describe("int", () => {
    it("returns integers within the inclusive range", () => {
      const rng = createRng(5);
      const seen = new Set<number>();
      for (let i = 0; i < 2_000; i++) {
        const value = rng.int(3, 6);
        expect(Number.isInteger(value)).toBe(true);
        seen.add(value);
      }
      expect([...seen].sort()).toEqual([3, 4, 5, 6]);
    });

    it("returns the only value when min equals max", () => {
      expect(createRng(5).int(4, 4)).toBe(4);
    });

    it("supports negative ranges", () => {
      const rng = createRng(8);
      for (let i = 0; i < 500; i++) {
        const value = rng.int(-3, -1);
        expect(value).toBeGreaterThanOrEqual(-3);
        expect(value).toBeLessThanOrEqual(-1);
      }
    });

    it("throws when min is greater than max", () => {
      expect(() => createRng(5).int(2, 1)).toThrow();
    });

    it("throws for non-integer bounds", () => {
      expect(() => createRng(5).int(0.5, 3)).toThrow();
    });
  });

  describe("pick", () => {
    it("returns every element of the list eventually", () => {
      const rng = createRng(11);
      const seen = new Set<string>();
      for (let i = 0; i < 200; i++) seen.add(rng.pick(["a", "b", "c"]));
      expect([...seen].sort()).toEqual(["a", "b", "c"]);
    });

    it("throws for an empty list", () => {
      expect(() => createRng(11).pick([])).toThrow();
    });
  });

  describe("chance", () => {
    it("never succeeds at probability 0 and always at probability 1", () => {
      const rng = createRng(3);
      for (let i = 0; i < 500; i++) {
        expect(rng.chance(0)).toBe(false);
        expect(rng.chance(1)).toBe(true);
      }
    });

    it("succeeds about p of the time", () => {
      const rng = createRng(21);
      let hits = 0;
      for (let i = 0; i < 100_000; i++) if (rng.chance(0.3)) hits += 1;
      expect(Math.abs(hits / 100_000 - 0.3)).toBeLessThan(0.01);
    });

    it("throws for probabilities outside [0, 1]", () => {
      expect(() => createRng(3).chance(-0.1)).toThrow();
      expect(() => createRng(3).chance(1.1)).toThrow();
    });
  });

  describe("fork", () => {
    it("gives the same stream for the same seed and name", () => {
      const a = createRng(10).fork("commentary");
      const b = createRng(10).fork("commentary");
      expect([a.next(), a.next()]).toEqual([b.next(), b.next()]);
    });

    it("gives different streams for different names", () => {
      const a = createRng(10).fork("simulation");
      const b = createRng(10).fork("commentary");
      expect(a.next()).not.toBe(b.next());
    });

    it("differs from the parent stream", () => {
      expect(createRng(10).fork("x").next()).not.toBe(createRng(10).next());
    });

    it("does not advance the parent", () => {
      const parent = createRng(10);
      const reference = createRng(10);
      const child = parent.fork("commentary");
      for (let i = 0; i < 50; i++) child.next();
      expect(parent.next()).toBe(reference.next());
    });

    it("is independent of how far the parent has advanced", () => {
      const early = createRng(10);
      const late = createRng(10);
      for (let i = 0; i < 25; i++) late.next();
      expect(early.fork("s").next()).toBe(late.fork("s").next());
    });

    it("supports forking a fork", () => {
      const a = createRng(10).fork("a").fork("b");
      const b = createRng(10).fork("a").fork("b");
      const other = createRng(10).fork("a").fork("c");
      expect(a.next()).toBe(b.next());
      expect(createRng(10).fork("a").fork("b").next()).not.toBe(other.next());
    });
  });
});
