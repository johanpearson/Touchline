import type { Side } from "../match-state";
import type { Rng } from "../rng";
import type { PassOutcome, PassVariant } from "./action-event";
import { clamp, rating } from "./attribute-rating";
import {
  CROSS_DEFLECTED_CORNER_SHARE,
  CROSS_INTERCEPTED_CORNER_SHARE,
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
import type { Challenger, Resolution, Restart } from "./open-play-types";
import { type Exit, exitPoint, restartAfterOutOfPlay } from "./out-of-play";
import { PITCH_LENGTH, PITCH_WIDTH, type Point } from "./pitch-metres";
import { interceptionChance, resolveInterception } from "./resolve-interception";
import { distanceToSegment } from "./segment-distance";

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
  /** The passer's tempo effect on completion (added); 0 when absent. */
  passSuccess?: number;
  /** The passer's home advantage (added to completion); 0 when absent. */
  advantage?: number;
  /** The opponent's press and home advantage added to an interception; 0 when absent. */
  interceptBonus?: number;
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
      PASS_PRESSURE_PENALTY * input.pressure +
      (input.passSuccess ?? 0) +
      (input.advantage ?? 0),
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

const outOfPlayRestart = (input: PassInput, exit: Exit, rng: Rng): Restart => {
  const restart = restartAfterOutOfPlay(input.side, exit);
  const deflectable =
    input.variant === "cross" && exit.boundary === "endLine" && restart.variant === "goalKick";
  if (!deflectable || rng.next() >= CROSS_DEFLECTED_CORNER_SHARE) return restart;
  return cornerAt(input.side, exit.point);
};

const cornerAt = (side: Side, point: Point): Restart => ({
  team: side,
  variant: "corner",
  position: {
    x: side === "home" ? PITCH_LENGTH : 0,
    y: point.y < PITCH_WIDTH / 2 ? 0 : PITCH_WIDTH,
  },
});

/** A defender who reads a cross may put it behind the goal line: a corner for the crossing side. */
const interceptedCrossCorner = (input: PassInput, rng: Rng): Restart | undefined =>
  input.variant === "cross" && rng.next() < CROSS_INTERCEPTED_CORNER_SHARE
    ? cornerAt(input.side, input.to)
    : undefined;

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
      interceptionChance(c, input.pressure, input.interceptBonus) >
        interceptionChance(b, input.pressure, input.interceptBonus)
        ? c
        : b,
    undefined,
  );
  if (best !== undefined) {
    const interception = resolveInterception(
      { side, interceptor: best, pressure: input.pressure, bonus: input.interceptBonus },
      rng,
    );
    if (interception.outcome === "won") {
      const corner = interceptedCrossCorner(input, rng);
      if (corner !== undefined) {
        return {
          outcome: "intercepted",
          ball: corner.position,
          possession: { side: corner.team },
          restart: corner,
        };
      }
      return {
        outcome: "intercepted",
        ball: interception.ball,
        possession: interception.possession,
      };
    }
  }
  if (rng.next() < PASS_OUT_SHARE[input.variant]) {
    const exit = exitPoint(from, to);
    const restart = outOfPlayRestart(input, exit, rng);
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
