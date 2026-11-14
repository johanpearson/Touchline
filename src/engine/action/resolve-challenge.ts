import type { Side } from "../match-state";
import type { Rng } from "../rng";
import type { TackleOutcome } from "./action-event";
import { clamp, rating } from "./attribute-rating";
import {
  FOUL_BASE,
  FOUL_MAX,
  FOUL_MIN,
  FOUL_SKILL_GAIN,
  PENALTY_AREA_DEPTH,
  PENALTY_AREA_HALF_WIDTH,
  TACKLE_WIN_BASE,
  TACKLE_WIN_MAX,
  TACKLE_WIN_MIN,
  TACKLE_WIN_PRESSURE_GAIN,
  TACKLE_WIN_SKILL_GAIN,
} from "./decision-constants";
import type { EnginePlayer } from "./engine-player";
import type { Resolution } from "./open-play-types";
import { PITCH_LENGTH, PITCH_WIDTH, type Point } from "./pitch-metres";

export type ChallengeInput = {
  carrierSide: Side;
  carrierSlot: number;
  carrier: EnginePlayer;
  tacklerSlot: number;
  tackler: EnginePlayer;
  /** Where the challenge happens (the carrier's position). */
  point: Point;
  /** Pressure on the carrier, 0..1. */
  pressure: number;
  /** Added to the chance that the tackler wins the ball (home advantage); 0 when absent. */
  advantage?: number;
};

const inAttackedPenaltyArea = (side: Side, p: Point): boolean => {
  const depth = side === "home" ? PITCH_LENGTH - p.x : p.x;
  return depth <= PENALTY_AREA_DEPTH && Math.abs(p.y - PITCH_WIDTH / 2) <= PENALTY_AREA_HALF_WIDTH;
};

export const foulChance = (tackler: EnginePlayer): number =>
  clamp(FOUL_BASE - FOUL_SKILL_GAIN * (rating(tackler, "tackling") - 0.5), FOUL_MIN, FOUL_MAX);

export const tackleWinChance = (input: ChallengeInput): number => {
  const tacklerSkill =
    0.6 * rating(input.tackler, "tackling") + 0.4 * rating(input.tackler, "strength");
  const carrierSkill =
    0.6 * rating(input.carrier, "dribbling") + 0.4 * rating(input.carrier, "strength");
  return clamp(
    TACKLE_WIN_BASE +
      TACKLE_WIN_SKILL_GAIN * (tacklerSkill - carrierSkill) +
      TACKLE_WIN_PRESSURE_GAIN * input.pressure +
      (input.advantage ?? 0),
    TACKLE_WIN_MIN,
    TACKLE_WIN_MAX,
  );
};

/**
 * A tackle ends `foul` (free kick, or penalty in the attacked area, for the carrier's side), `won`
 * (the tackler takes the ball) or `lost`. One draw: the foul chance first, the win chance on the rest.
 */
export const resolveChallenge = (input: ChallengeInput, rng: Rng): Resolution<TackleOutcome> => {
  const { carrierSide, point } = input;
  const draw = rng.next();
  const pFoul = foulChance(input.tackler);
  if (draw < pFoul) {
    const variant = inAttackedPenaltyArea(carrierSide, point) ? "penalty" : "freeKick";
    return {
      outcome: "foul",
      ball: point,
      possession: { side: carrierSide },
      restart: { team: carrierSide, variant, position: point },
    };
  }
  if ((draw - pFoul) / (1 - pFoul) < tackleWinChance(input)) {
    const side: Side = carrierSide === "home" ? "away" : "home";
    return { outcome: "won", ball: point, possession: { side, slot: input.tacklerSlot } };
  }
  return {
    outcome: "lost",
    ball: point,
    possession: { side: carrierSide, slot: input.carrierSlot },
  };
};
