import type { TeamTactics } from "../tactics";
import {
  CENTRAL_SHOT_CHANNEL,
  MENTALITY_DIRECTNESS,
  MENTALITY_RISK,
  MENTALITY_SHOT,
  PRESSING_SPACE_BEHIND,
  PRESSING_TRIGGER_SCALE,
  PRESSING_TURNOVER_BONUS,
  TEMPO_DIRECTNESS,
  TEMPO_DRAW_EXPONENT,
  TEMPO_PASS_SUCCESS,
  WIDTH_CENTRAL_SHOT,
  WIDTH_WIDE_BONUS,
} from "./decision-constants";
import {
  MENTALITY_COMPACTNESS,
  MENTALITY_LINE_HEIGHT,
  PRESSING_COMPACTNESS,
  PRESSING_LINE_HEIGHT,
  PRESSURE_RADIUS,
  WIDTH_SCALE,
} from "./shape-constants";

/**
 * The named parameters the four tactic settings turn into in the action engine. This is the only
 * place that reads the settings; everything else reads these numbers. Additive values are 0 and
 * multipliers 1 for the neutral tactics, so neutral is the baseline. The tables behind the values
 * are in `decision-constants.ts` and `shape-constants.ts`.
 */
export type ActionTactics = {
  /** Added to the base weight on forward progress (tempo and mentality). */
  directness: number;
  /** Multiplies the weight of risky passes (long, through, cross). */
  risk: number;
  /** Multiplies the shot weight. */
  shotWeight: number;
  /** Multiplies the weight of passes to wide targets and of crosses. */
  wideBonus: number;
  /** Multiplies the weight of a shot from the central channel. */
  centralShot: number;
  /** Exponent on the action duration draw: below 1 gives longer actions, above 1 shorter ones. */
  tempoExponent: number;
  /** Added to the completion chance of the team's own passes. */
  passSuccess: number;
  /** Metres the block moves up the pitch (pressing and mentality). */
  lineHeight: number;
  /** Multiplies the distance between lines (pressing and mentality). */
  compactness: number;
  /** Multiplies the lateral spread. */
  width: number;
  /** Press trigger distance in metres: opponents closer than this feel the team's pressure. */
  pressRadius: number;
  /** Added to the chance of winning the ball from an opponent building up in their own half. */
  turnoverBonus: number;
  /** Multiplies through pass and carry weights of an opponent that has just won the ball. */
  spaceBehind: number;
};

export const actionTactics = (tactics: TeamTactics): ActionTactics => ({
  directness: TEMPO_DIRECTNESS[tactics.tempo] + MENTALITY_DIRECTNESS[tactics.mentality],
  risk: MENTALITY_RISK[tactics.mentality],
  shotWeight: MENTALITY_SHOT[tactics.mentality],
  wideBonus: WIDTH_WIDE_BONUS[tactics.width],
  centralShot: WIDTH_CENTRAL_SHOT[tactics.width],
  tempoExponent: TEMPO_DRAW_EXPONENT[tactics.tempo],
  passSuccess: TEMPO_PASS_SUCCESS[tactics.tempo],
  lineHeight: PRESSING_LINE_HEIGHT[tactics.pressing] + MENTALITY_LINE_HEIGHT[tactics.mentality],
  compactness: PRESSING_COMPACTNESS[tactics.pressing] * MENTALITY_COMPACTNESS[tactics.mentality],
  width: WIDTH_SCALE[tactics.width],
  pressRadius: PRESSURE_RADIUS * PRESSING_TRIGGER_SCALE[tactics.pressing],
  turnoverBonus: PRESSING_TURNOVER_BONUS[tactics.pressing],
  spaceBehind: PRESSING_SPACE_BEHIND[tactics.pressing],
});

/** True when a shot from `y` (metres across the pitch) is in the central channel. */
export const isCentralShot = (y: number, pitchWidth: number): boolean =>
  Math.abs(y - pitchWidth / 2) <= CENTRAL_SHOT_CHANNEL;
