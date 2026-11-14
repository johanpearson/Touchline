import type { Side } from "../match-state";
import type { Rng } from "../rng";
import { clamp, rating } from "./attribute-rating";
import {
  INTERCEPT_BASE,
  INTERCEPT_MAX,
  INTERCEPT_MIN,
  INTERCEPT_PRESSURE_GAIN,
  INTERCEPT_SKILL_GAIN,
} from "./decision-constants";
import type { Challenger, Resolution } from "./open-play-types";

export type InterceptionInput = {
  /** The side that played the pass. */
  side: Side;
  /** The opponent standing on the lane. */
  interceptor: Challenger;
  /** Pressure on the passer, 0..1: a hurried pass is easier to read. */
  pressure: number;
  /** Added to the chance (the interceptor's press and home advantage); 0 when absent. */
  bonus?: number;
};

export type InterceptionResolution = Resolution<"won"> | { outcome: "missed" };

/** Chance that `interceptor` cuts out the pass (positioning and work rate, pressure on the passer). */
export const interceptionChance = (
  interceptor: Challenger,
  pressure: number,
  bonus = 0,
): number => {
  const skill =
    (rating(interceptor.player, "positioning") + rating(interceptor.player, "workRate")) / 2;
  return clamp(
    INTERCEPT_BASE +
      INTERCEPT_SKILL_GAIN * (skill - 0.5) +
      INTERCEPT_PRESSURE_GAIN * pressure +
      bonus,
    INTERCEPT_MIN,
    INTERCEPT_MAX,
  );
};

/** One draw: the interceptor wins the ball at their own position, or misses. */
export const resolveInterception = (input: InterceptionInput, rng: Rng): InterceptionResolution => {
  if (rng.next() >= interceptionChance(input.interceptor, input.pressure, input.bonus)) {
    return { outcome: "missed" };
  }
  const side: Side = input.side === "home" ? "away" : "home";
  return {
    outcome: "won",
    ball: input.interceptor.point,
    possession: { side, slot: input.interceptor.slot },
  };
};
