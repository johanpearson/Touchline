import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { aClub } from "./game-builders";
import { generateLeague } from "./generate-league";
import { chooseKits, colourDistance, KIT_CLASH_THRESHOLD, kitsOf } from "./kits";

const colourArb = fc
  .integer({ min: 0, max: 0xffffff })
  .map((n) => `#${n.toString(16).padStart(6, "0")}`);

const clubWith = (id: string, primary: string, secondary: string) =>
  aClub().withId(id).withColours(primary, secondary).build();

describe("kitsOf", () => {
  it("derives the home kit from primary body and secondary trim", () => {
    const { home } = kitsOf(clubWith("a", "#d62828", "#ffffff"));
    expect(home).toEqual({ body: "#d62828", trim: "#ffffff" });
  });

  it("derives the away kit by swapping body and trim", () => {
    const { away } = kitsOf(clubWith("a", "#d62828", "#ffffff"));
    expect(away).toEqual({ body: "#ffffff", trim: "#d62828" });
  });
});

describe("colourDistance", () => {
  it("is zero for equal colours", () => {
    expect(colourDistance("#d62828", "#d62828")).toBe(0);
  });

  it("is symmetric", () => {
    fc.assert(
      fc.property(colourArb, colourArb, (a, b) => {
        expect(colourDistance(a, b)).toBeCloseTo(colourDistance(b, a), 9);
      }),
    );
  });

  it("is large for black against white", () => {
    expect(colourDistance("#000000", "#ffffff")).toBeGreaterThan(90);
  });
});

describe("chooseKits", () => {
  const clash = KIT_CLASH_THRESHOLD;

  it.each([
    ["identical colours", "#d62828", "#d62828", true],
    ["red against a similar dark red", "#d62828", "#c02020", true],
    ["black against white", "#000000", "#ffffff", false],
    ["red against blue", "#d62828", "#2f9bff", false],
  ])(`decides %s with the threshold ${clash}`, (_name, a, b, clashes) => {
    expect(colourDistance(a, b) < clash).toBe(clashes);
    const home = clubWith("h", a, "#111111");
    const away = clubWith("a", b, "#eeeeee");
    const worn = chooseKits(home, away);
    expect(worn.away.body === away.colours.secondary).toBe(clashes);
  });

  it("always puts the home team in its home kit", () => {
    const home = clubWith("h", "#d62828", "#ffffff");
    const away = clubWith("a", "#d62828", "#ffffff");
    expect(chooseKits(home, away).home).toEqual(kitsOf(home).home);
  });

  it("picks the away kit farthest from the home body when both clash", () => {
    const home = clubWith("h", "#d62828", "#111111");
    const away = clubWith("a", "#d62828", "#d02a2a");
    const worn = chooseKits(home, away);
    const options = [kitsOf(away).home.body, kitsOf(away).away.body];
    const farthest = Math.max(...options.map((c) => colourDistance(c, "#d62828")));
    expect(colourDistance(worn.away.body, "#d62828")).toBe(farthest);
  });

  it("is deterministic", () => {
    const home = clubWith("h", "#d62828", "#ffffff");
    const away = clubWith("a", "#d62828", "#ffffff");
    expect(chooseKits(home, away)).toEqual(chooseKits(home, away));
  });

  it("never wears two body colours closer than the threshold when an away kit avoids it", () => {
    fc.assert(
      fc.property(colourArb, colourArb, colourArb, colourArb, (hp, hs, ap, as) => {
        const home = clubWith("h", hp, hs);
        const away = clubWith("a", ap, as);
        const worn = chooseKits(home, away);
        const avoidable = [kitsOf(away).home, kitsOf(away).away].some(
          (kit) => colourDistance(kit.body, kitsOf(home).home.body) >= clash,
        );
        if (avoidable) {
          expect(colourDistance(worn.home.body, worn.away.body)).toBeGreaterThanOrEqual(clash);
        }
      }),
    );
  });

  it.each(Array.from({ length: 20 }, (_, i) => i + 1))(
    "keeps every pair of the 14 clubs of league seed %i distinguishable",
    (seed) => {
      const result = generateLeague({ seed });
      if (!result.ok) throw new Error("league failed");
      const { clubs } = result.league;
      for (const home of clubs) {
        for (const away of clubs) {
          if (home.id === away.id) continue;
          const worn = chooseKits(home, away);
          expect(colourDistance(worn.home.body, worn.away.body)).toBeGreaterThanOrEqual(clash);
        }
      }
    },
  );
});
