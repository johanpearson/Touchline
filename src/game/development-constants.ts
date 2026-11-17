import type { AttributeName } from "./player";

/** Season minutes at or below which playing time gives the smallest growth factor. */
export const MINUTES_LOW = 450;
/** Season minutes at or above which playing time gives the largest growth factor. */
export const MINUTES_HIGH = 1800;
/** Growth factor at `MINUTES_LOW` and below. */
export const GROWTH_FACTOR_LOW = 0.5;
/** Growth factor at `MINUTES_HIGH` and above. */
export const GROWTH_FACTOR_HIGH = 1.25;

/** The most any attribute changes in one season, up or down. */
export const MAX_CHANGE_PER_SEASON = 3;

/** Players this old (after the birthday) or younger only grow, towards their potential. */
export const GROWTH_MAX_AGE = 24;
/** Players this old or younger (and above `GROWTH_MAX_AGE`) are on the plateau. */
export const PLATEAU_MAX_AGE = 29;

/** Share of the gap to potential closed per attribute and season, by the highest age of a band (before the playing-time factor). */
export const GROWTH_SHARES: readonly { maxAge: number; share: number }[] = [
  { maxAge: 17, share: 0.3 },
  { maxAge: 21, share: 0.35 },
  { maxAge: GROWTH_MAX_AGE, share: 0.2 },
];

/** Plateau: chance of +1 per attribute (times the growth factor) and chance of -1. */
export const PLATEAU_UP_CHANCE = 0.2;
export const PLATEAU_DOWN_CHANCE = 0.2;

/** Decline from `PLATEAU_MAX_AGE + 1`: expected loss per attribute is `base + step * (age - 30)`. */
export const DECLINE_PHYSICAL = { base: 0.4, step: 0.25 };
export const DECLINE_TECHNICAL = { base: 0.1, step: 0.12 };

/** The attributes that fall first and fastest with age. */
export const PHYSICAL_ATTRIBUTES: readonly AttributeName[] = ["pace", "strength", "workRate"];

/** Goalkeepers are developed on these only; outfield players never change them. */
export const KEEPER_ATTRIBUTES: readonly AttributeName[] = ["handling", "reflexes"];
