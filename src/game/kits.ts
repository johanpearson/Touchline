import type { Club } from "./club";

/** One kit: the body colour is what the player sees from afar, the trim is a second accent. */
export type Kit = { body: string; trim: string };

export type ClubKits = { home: Kit; away: Kit };

/**
 * Two body colours closer than this (CIE76 distance in CIELAB, 0 to ~100) count as a clash.
 * A just-noticeable difference is about 2.3; 30 keeps two teams clearly apart on a pitch.
 */
export const KIT_CLASH_THRESHOLD = 30;

/** Home: primary body, secondary trim. Away: secondary body, primary trim. */
export const kitsOf = (club: Club): ClubKits => ({
  home: { body: club.colours.primary, trim: club.colours.secondary },
  away: { body: club.colours.secondary, trim: club.colours.primary },
});

type Lab = readonly [number, number, number];

const srgbToLinear = (channel: number): number => {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};

const labCurve = (t: number): number =>
  t > 216 / 24389 ? Math.cbrt(t) : ((24389 / 27) * t + 16) / 116;

/** `#rrggbb` (D65) to CIELAB. Malformed input reads as black, so the result is always finite. */
const toLab = (hex: string): Lab => {
  const n = Number.parseInt(hex.replace("#", ""), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(srgbToLinear) as [
    number,
    number,
    number,
  ];
  const x = labCurve((0.4124564 * r + 0.3575761 * g + 0.1804375 * b) / 0.95047);
  const y = labCurve(0.2126729 * r + 0.7151522 * g + 0.072175 * b);
  const z = labCurve((0.0193339 * r + 0.119192 * g + 0.9503041 * b) / 1.08883);
  return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
};

/** CIE76: Euclidean distance in CIELAB. Symmetric, zero for equal colours. */
export const colourDistance = (a: string, b: string): number => {
  const [l1, a1, b1] = toLab(a);
  const [l2, a2, b2] = toLab(b);
  return Math.hypot(l1 - l2, a1 - a2, b1 - b2);
};

/**
 * The kits worn in a match. The home side always wears its home kit. The away side wears
 * its home kit unless that clashes; then its away kit, or whichever kit is farthest from
 * the home body colour if both clash.
 */
export const chooseKits = (home: Club, away: Club): { home: Kit; away: Kit } => {
  const homeKit = kitsOf(home).home;
  const awayKits = kitsOf(away);
  const distance = (kit: Kit): number => colourDistance(kit.body, homeKit.body);
  if (distance(awayKits.home) >= KIT_CLASH_THRESHOLD) return { home: homeKit, away: awayKits.home };
  if (distance(awayKits.away) >= KIT_CLASH_THRESHOLD) return { home: homeKit, away: awayKits.away };
  return {
    home: homeKit,
    away: distance(awayKits.away) > distance(awayKits.home) ? awayKits.away : awayKits.home,
  };
};
