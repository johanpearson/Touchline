import { describe, expect, it } from "vitest";
import { possessive } from "../commentary/grammar";
import { createRng } from "../engine";
import type { ClubIdentity } from "./generate-club-identities";
import { CLUB_PLACE_NAMES, generateClubIdentities } from "./generate-club-identities";

const generate = (count: number, seed = 1): ClubIdentity[] => {
  const result = generateClubIdentities(count, createRng(seed));
  if (!result.ok) throw new Error(`expected success, got ${result.error}`);
  return result.identities;
};

const channel = (hex: string, start: number): number =>
  Number.parseInt(hex.slice(start, start + 2), 16) / 255;

const hsl = (hex: string): { h: number; s: number; l: number } => {
  const [r, g, b] = [channel(hex, 1), channel(hex, 3), channel(hex, 5)] as [number, number, number];
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  const l = (max + min) / 2;
  if (d === 0) return { h: 0, s: 0, l };
  const s = d / (1 - Math.abs(2 * l - 1));
  const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return { h: (h * 60 + 360) % 360, s, l };
};

const linear = (c: number): number => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);

const luminance = (hex: string): number =>
  0.2126 * linear(channel(hex, 1)) +
  0.7152 * linear(channel(hex, 3)) +
  0.0722 * linear(channel(hex, 5));

const contrastRatio = (a: string, b: string): number => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
};

const hueDistance = (a: string, b: string): number => {
  const d = Math.abs(hsl(a).h - hsl(b).h);
  return Math.min(d, 360 - d);
};

describe("generateClubIdentities", () => {
  it("returns exactly the requested number of identities for every count from 1 to 24", () => {
    for (let count = 1; count <= 24; count++) {
      expect(generate(count, count)).toHaveLength(count);
    }
  });

  it("gives every identity a unique name, short name and id", () => {
    const clubs = generate(24);
    for (const key of ["name", "shortName", "id"] as const) {
      expect(new Set(clubs.map((c) => c[key])).size).toBe(24);
    }
  });

  it("uses three uppercase letters for short names", () => {
    for (const club of generate(24)) expect(club.shortName).toMatch(/^\p{Lu}{3}$/u);
  });

  it("makes ids stable lowercase ascii slugs", () => {
    for (const club of generate(24, 7)) expect(club.id).toMatch(/^[a-z]+(-[a-z]+)*$/);
  });

  it("slugifies å, ä and ö to ascii in ids while keeping them in names", () => {
    const names = CLUB_PLACE_NAMES.filter((n) => /[åäö]/i.test(n));
    expect(names.length).toBeGreaterThan(0);
    const clubs = generate(CLUB_PLACE_NAMES.length);
    const swedish = clubs.filter((c) => /[åäöÅÄÖ]/.test(c.name));
    expect(swedish.length).toBeGreaterThan(0);
    for (const club of swedish) expect(club.id).not.toMatch(/[^a-z-]/);
  });

  it("has place names whose first three letters are all different", () => {
    const prefixes = CLUB_PLACE_NAMES.map((n) => n.slice(0, 3).toUpperCase());
    expect(new Set(prefixes).size).toBe(CLUB_PLACE_NAMES.length);
  });

  it("uses #rrggbb colours", () => {
    for (const club of generate(24)) {
      expect(club.colours.primary).toMatch(/^#[0-9a-f]{6}$/);
      expect(club.colours.secondary).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it("gives 16 clubs primary colours at least 20 degrees apart in hue", () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      const primaries = generate(16, seed).map((c) => c.colours.primary);
      for (let i = 0; i < primaries.length; i++) {
        for (let j = i + 1; j < primaries.length; j++) {
          const distance = hueDistance(primaries[i] as string, primaries[j] as string);
          expect(distance).toBeGreaterThanOrEqual(20);
        }
      }
    }
  });

  it("gives every secondary colour a contrast ratio of at least 4.5 against its primary", () => {
    for (let seed = 1; seed <= 20; seed++) {
      for (const club of generate(24, seed)) {
        expect(contrastRatio(club.colours.primary, club.colours.secondary)).toBeGreaterThanOrEqual(
          4.5,
        );
      }
    }
  });

  it("is deterministic for the same seed", () => {
    expect(generate(14, 42)).toEqual(generate(14, 42));
  });

  it("gives different output for different seeds", () => {
    const outputs = new Set<string>();
    for (let seed = 1; seed <= 50; seed++) outputs.add(JSON.stringify(generate(14, seed)));
    expect(outputs.size).toBe(50);
  });

  it("matches the snapshot for seed 1", () => {
    expect(generate(4, 1)).toMatchInlineSnapshot(`
      [
        {
          "colours": {
            "primary": "#1f39af",
            "secondary": "#ffffff",
          },
          "id": "brunnby-town",
          "name": "Brunnby Town",
          "shortName": "BRU",
        },
        {
          "colours": {
            "primary": "#17853a",
            "secondary": "#ffffff",
          },
          "id": "norrvik-city",
          "name": "Norrvik City",
          "shortName": "NOR",
        },
        {
          "colours": {
            "primary": "#b72087",
            "secondary": "#ffffff",
          },
          "id": "fjallby",
          "name": "Fjällby",
          "shortName": "FJÄ",
        },
        {
          "colours": {
            "primary": "#887418",
            "secondary": "#ffffff",
          },
          "id": "granfors",
          "name": "Granfors",
          "shortName": "GRA",
        },
      ]
    `);
  });

  it("generates 24 clubs for any seed", () => {
    for (let seed = 0; seed < 200; seed++) expect(generate(24, seed)).toHaveLength(24);
  });

  it("returns a pool-exhausted error instead of throwing when asking for too many clubs", () => {
    const result = generateClubIdentities(CLUB_PLACE_NAMES.length + 1, createRng(1));
    expect(result).toEqual({ ok: false, error: "pool-exhausted" });
  });

  it("returns an invalid-count error for counts below 1 or non-integers", () => {
    expect(generateClubIdentities(0, createRng(1))).toEqual({ ok: false, error: "invalid-count" });
    expect(generateClubIdentities(2.5, createRng(1))).toEqual({
      ok: false,
      error: "invalid-count",
    });
  });

  it("produces names the Swedish genitive helper handles", () => {
    expect(possessive("sv", "Västerås Park")).toBe("Västerås Parks");
    const names = generate(24).map((c) => c.name);
    for (const name of names) {
      const genitive = possessive("sv", name);
      expect(genitive.startsWith(name)).toBe(true);
      expect(genitive.length - name.length).toBeLessThanOrEqual(1);
    }
  });
});
