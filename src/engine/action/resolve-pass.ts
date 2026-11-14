import type { Side } from "../match-state";
import type { Rng } from "../rng";
import type { PassOutcome, PassVariant } from "./action-event";
import { clamp, rating } from "./attribute-rating";
import {
  LANE_RADIUS,
  PASS_BASE_COMPLETE,
  PASS_COMPLETE_MAX,
  PASS_COMPLETE_MIN,
  PASS_OUT_SHARE,
  PASS_PRESSURE_PENALTY,
  PASS_RECEIVER_GAIN,
  PASS_SKILL_GAIN,
} from "./decision-constants";
import type { EnginePlayer } from "./engine-player";
import type { Challenger, Resolution } from "./open-play-types";
import { exitPoint, restartAfterOutOfPlay } from "./out-of-play";
import type { Point } from "./pitch-metres";
import { interceptionChance, resolveInterception } from "./resolve-interception";

export type PassInput = {
  side: Side;
  passer: EnginePlayer;
  receiverSlot: number;
  receiver: EnginePlayer;
  variant: PassVariant;
  from: Point;
  to: Point;
  /** Pressure on the passer, 0..1. */
  pressure: number;
  /** Every opponent on the pitch with their position. */
  opponents: readonly Challenger[];
};

const distanceToSegment = (p: Point, a: Point, b: Point): number => {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSquared = dx * dx + dy * dy;
  const t =
    lengthSquared === 0 ? 0 : clamp(((p.x - a.x) * dx + (p.y - a.y) * dy) / lengthSquared, 0, 1);
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
};

/** Opponents within `LANE_RADIUS` of the pass lane. */
export const laneInterceptors = (
  from: Point,
  to: Point,
  opponents: readonly Challenger[],
): Challenger[] => opponents.filter((o) => distanceToSegment(o.point, from, to) <= LANE_RADIUS);

export const passCompletionChance = (input: PassInput): number => {
  const skill = 0.6 * rating(input.passer, "passing") + 0.4 * rating(input.passer, "ballControl");
  return clamp(
    PASS_BASE_COMPLETE[input.variant] +
      PASS_SKILL_GAIN * (skill - 0.5) +
      PASS_RECEIVER_GAIN * (rating(input.receiver, "ballControl") - 0.5) -
      PASS_PRESSURE_PENALTY * input.pressure,
    PASS_COMPLETE_MIN,
    PASS_COMPLETE_MAX,
  );
};

const nearestOpponent = (to: Point, opponents: readonly Challenger[]): Challenger | undefined =>
  opponents.reduce<Challenger | undefined>(
    (best, o) =>
      best === undefined ||
      Math.hypot(o.point.x - to.x, o.point.y - to.y) <
        Math.hypot(best.point.x - to.x, best.point.y - to.y)
        ? o
        : best,
    undefined,
  );

const other = (side: Side): Side => (side === "home" ? "away" : "home");

/**
 * A pass ends `complete`, `intercepted` (a lane opponent reads it), `outOfPlay` or `incomplete`
 * (still in play, an opponent gets the ball). Draws: completion, then the best lane interceptor's
 * attempt (if any), then in play against out.
 */
export const resolvePass = (input: PassInput, rng: Rng): Resolution<PassOutcome> => {
  const { side, from, to } = input;
  if (rng.next() < passCompletionChance(input)) {
    return {
      outcome: "complete",
      ball: to,
      possession: { side, slot: input.receiverSlot },
    };
  }
  const lane = laneInterceptors(from, to, input.opponents);
  const best = lane.reduce<Challenger | undefined>(
    (b, c) =>
      b === undefined ||
      interceptionChance(c, input.pressure) > interceptionChance(b, input.pressure)
        ? c
        : b,
    undefined,
  );
  if (best !== undefined) {
    const interception = resolveInterception(
      { side, interceptor: best, pressure: input.pressure },
      rng,
    );
    if (interception.outcome === "won") {
      return {
        outcome: "intercepted",
        ball: interception.ball,
        possession: interception.possession,
      };
    }
  }
  if (rng.next() < PASS_OUT_SHARE[input.variant]) {
    const exit = exitPoint(from, to);
    const restart = restartAfterOutOfPlay(side, exit);
    return {
      outcome: "outOfPlay",
      ball: restart.position,
      possession: { side: restart.team },
      restart,
    };
  }
  const winner = nearestOpponent(to, input.opponents);
  return {
    outcome: "incomplete",
    ball: to,
    possession:
      winner === undefined ? { side: other(side) } : { side: other(side), slot: winner.slot },
  };
};
