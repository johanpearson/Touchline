import { ATTRIBUTE_NAMES, MIN_ATTRIBUTE, type Player, type PlayerAttributes } from "./player";
import { effectiveAttributes, type PlayerCondition } from "./player-condition";
import { overallIn } from "./player-overall";
import type { PlayerPosition } from "./squad-player";

/** Share of a rating lost when playing one line away from the own position (DEF/MID, MID/FWD). */
export const OUTFIELD_ONE_LINE_PENALTY = 0.1;
/** Share lost when playing two lines away (DEF/FWD). */
export const OUTFIELD_TWO_LINES_PENALTY = 0.2;
/** Share lost when a goalkeeper plays outside, or an outfielder plays in goal. */
export const GOALKEEPER_SWAP_PENALTY = 0.5;

const OUTFIELD_LINE: Record<Exclude<PlayerPosition, "GK">, number> = { DEF: 1, MID: 2, FWD: 3 };

/**
 * The share (0 to 1) of a player's quality lost at `played` instead of the `own` position. The
 * table is symmetric and never smaller further away; see "Out-of-position play" in docs/vision.md.
 */
export const positionPenalty = (own: PlayerPosition, played: PlayerPosition): number => {
  if (own === played) return 0;
  if (own === "GK" || played === "GK") return GOALKEEPER_SWAP_PENALTY;
  return Math.abs(OUTFIELD_LINE[own] - OUTFIELD_LINE[played]) === 1
    ? OUTFIELD_ONE_LINE_PENALTY
    : OUTFIELD_TWO_LINES_PENALTY;
};

/**
 * The attributes a player plays with at `played`: every attribute scaled by the position penalty
 * (never below the minimum). Unchanged at the own position.
 */
export const attributesAtPosition = <T extends PlayerAttributes>(
  attributes: T,
  own: PlayerPosition,
  played: PlayerPosition,
): T => {
  const factor = 1 - positionPenalty(own, played);
  if (factor === 1) return attributes;
  return {
    ...attributes,
    ...Object.fromEntries(
      ATTRIBUTE_NAMES.map((name) => [name, Math.max(MIN_ATTRIBUTE, attributes[name] * factor)]),
    ),
  };
};

/** A player's rating, 1..20, at the position played; the own overall at the own position. */
export const positionRating = (player: Player, played: PlayerPosition): number =>
  overallIn(played, attributesAtPosition(player, player.position, played));

/**
 * A player's rating, 1..20, as the engine sees it at the position played: attributes scaled by
 * fitness and form first, then by the position penalty (the order `toEnginePlayers` uses).
 */
export const effectiveRating = (
  player: Player,
  played: PlayerPosition,
  condition: PlayerCondition,
): number =>
  overallIn(
    played,
    attributesAtPosition(effectiveAttributes(player, condition), player.position, played),
  );
