import type { Rng } from "../engine";

export type ClubIdentity = {
  id: string;
  name: string;
  shortName: string;
  colours: { primary: string; secondary: string };
};

export type ClubIdentityError = "invalid-count" | "pool-exhausted";

export type ClubIdentityResult =
  | { ok: true; identities: ClubIdentity[] }
  | { ok: false; error: ClubIdentityError };

/** Fictional Swedish-flavoured place names. The first three letters of each are unique. */
export const CLUB_PLACE_NAMES: readonly string[] = [
  "Kvarnby",
  "Västerås",
  "Norrvik",
  "Älvsund",
  "Björkhamn",
  "Ekeby",
  "Stenvik",
  "Lindö",
  "Granfors",
  "Hallsta",
  "Skogsnäs",
  "Mölnbo",
  "Fjällby",
  "Torsvik",
  "Ängsvik Norra",
  "Sandvik Syd",
  "Rödåsen",
  "Havsvik",
  "Ormberg",
  "Vallsta",
  "Åkerby",
  "Dalbro",
  "Nyvik",
  "Gullmark",
  "Brunnby",
  "Öresta",
  "Kallvik",
  "Pilfors",
  "Salthamn",
  "Tallnäs",
  "Ulvsby",
  "Vindsta Östra",
  "Järnvik",
  "Mossen",
  "Furuvik",
  "Hedmora Väst",
  "Isbro",
  "Krokvik",
  "Lövsta",
  "Rosenfors",
  "Silverå",
  "Trollbo",
  "Yxbo",
  "Bergsta",
  "Cederby",
  "Duvnäs",
  "Fagerhult",
  "Glimmen",
  "Hjortby",
  "Ingelsta",
  "Jägarbo",
  "Lerbäck",
  "Mörkmark",
  "Oxelby",
  "Persbo",
  "Rävsta",
  "Svartvik",
  "Tjärby",
  "Vedbo",
  "Zinkgruvan",
];

const SUFFIXES: readonly string[] = [
  "",
  "",
  "Park",
  "Rovers",
  "United",
  "Athletic",
  "Town",
  "City",
];

const MAX_CLUBS = CLUB_PLACE_NAMES.length;
const SATURATION = 0.7;
const LIGHTNESS_RANGE = { min: 0.3, max: 0.5 };
const LIGHT = "#ffffff";
const DARK = "#000000";
const MIN_CONTRAST = 4.5;

const slugify = (name: string): string =>
  name
    .toLowerCase()
    .replace(/[åä]/g, "a")
    .replace(/ö/g, "o")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const toHex = (value: number): string =>
  Math.round(value * 255)
    .toString(16)
    .padStart(2, "0");

const hslToHex = (hue: number, saturation: number, lightness: number): string => {
  const a = saturation * Math.min(lightness, 1 - lightness);
  const channel = (n: number): number => {
    const k = (n + hue / 30) % 12;
    return lightness - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
  };
  return `#${toHex(channel(0))}${toHex(channel(8))}${toHex(channel(4))}`;
};

const linear = (c: number): number => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);

const luminance = (hex: string): number => {
  const at = (i: number): number => linear(Number.parseInt(hex.slice(i, i + 2), 16) / 255);
  return 0.2126 * at(1) + 0.7152 * at(3) + 0.0722 * at(5);
};

const contrast = (a: string, b: string): number => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
};

const secondaryFor = (primary: string): string =>
  contrast(primary, LIGHT) >= MIN_CONTRAST ? LIGHT : DARK;

/** Fisher-Yates shuffle returning a new array. */
const shuffled = <T>(list: readonly T[], rng: Rng): T[] => {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = rng.int(0, i);
    [copy[i], copy[j]] = [copy[j] as T, copy[i] as T];
  }
  return copy;
};

/** Primary colours spread evenly around the hue wheel, so no two clubs look alike. */
const primaryColours = (count: number, rng: Rng): string[] => {
  const offset = rng.next() * 360;
  const hues = Array.from({ length: count }, (_, i) => (offset + (i * 360) / count) % 360);
  return shuffled(hues, rng).map((hue) => {
    const lightness =
      LIGHTNESS_RANGE.min + rng.next() * (LIGHTNESS_RANGE.max - LIGHTNESS_RANGE.min);
    return hslToHex(hue, SATURATION, lightness);
  });
};

const identityFor = (place: string, suffix: string, primary: string): ClubIdentity => {
  const name = suffix === "" ? place : `${place} ${suffix}`;
  return {
    id: slugify(name),
    name,
    shortName: place.slice(0, 3).toUpperCase(),
    colours: { primary, secondary: secondaryFor(primary) },
  };
};

/**
 * Generates `count` believable fictional club identities from a seeded RNG.
 * Names, short names and ids are unique within one call.
 */
export const generateClubIdentities = (count: number, rng: Rng): ClubIdentityResult => {
  if (!Number.isInteger(count) || count < 1) return { ok: false, error: "invalid-count" };
  if (count > MAX_CLUBS) return { ok: false, error: "pool-exhausted" };
  const places = shuffled(CLUB_PLACE_NAMES, rng.fork("places")).slice(0, count);
  const colours = primaryColours(count, rng.fork("colours"));
  const suffixRng = rng.fork("suffixes");
  const identities = places.map((place, i) =>
    identityFor(place, suffixRng.pick(SUFFIXES), colours[i] as string),
  );
  return { ok: true, identities };
};
