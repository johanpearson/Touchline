import type { Side } from "../match-state";
import type { Rng } from "../rng";
import type { ClearanceOutcome } from "./action-event";
import { clamp, rating } from "./attribute-rating";
import {
  CLEARANCE_BASE_DISTANCE,
  CLEARANCE_OUT_BASE,
  CLEARANCE_OUT_MAX,
  CLEARANCE_OUT_MIN,
  CLEARANCE_OUT_PRESSURE_GAIN,
  CLEARANCE_OUT_SKILL_GAIN,
  CLEARANCE_POSITIONING_REACH,
  CLEARANCE_SIDE_PULL,
  CLEARANCE_STRENGTH_GAIN,
} from "./decision-constants";
import type { EnginePlayer } from "./engine-player";
import type { Challenger, Resolution } from "./open-play-types";
import { exitPoint, restartAfterOutOfPlay } from "./out-of-play";
import { PITCH_LENGTH, PITCH_WIDTH, type Point } from "./pitch-metres";

export type ClearanceInput = {
  side: Side;
  clearer: EnginePlayer;
  clearerSlot: number;
  from: Point;
  /** Pressure on the clearer, 0..1. */
  pressure: number;
  /** The clearer's team mates (not the clearer) with their positions. */
  teammates: readonly Challenger[];
  opponents: readonly Challenger[];
};

/** The point the ball is aimed at: upfield, drifting towards the nearer touchline. Not clamped. */
const aim = (input: ClearanceInput): Point => {
  const direction = input.side === "home" ? 1 : -1;
  const distance =
    CLEARANCE_BASE_DISTANCE + CLEARANCE_STRENGTH_GAIN * rating(input.clearer, "strength");
  const nearerLine = input.from.y < PITCH_WIDTH / 2 ? 0 : PITCH_WIDTH;
  return {
    x: input.from.x + direction * distance,
    y: input.from.y + (nearerLine - input.from.y) * CLEARANCE_SIDE_PULL,
  };
};

const outChance = (input: ClearanceInput): number =>
  clamp(
    CLEARANCE_OUT_BASE -
      CLEARANCE_OUT_SKILL_GAIN * (rating(input.clearer, "ballControl") - 0.5) +
      CLEARANCE_OUT_PRESSURE_GAIN * input.pressure,
    CLEARANCE_OUT_MIN,
    CLEARANCE_OUT_MAX,
  );

const reach = (landing: Point, c: Challenger): number =>
  Math.hypot(c.point.x - landing.x, c.point.y - landing.y) -
  CLEARANCE_POSITIONING_REACH * rating(c.player, "positioning");

/**
 * A clearance is `kept` in play (whoever is closest to where it lands, counting positioning, gets
 * it) or goes `outOfPlay`. One draw.
 */
export const resolveClearance = (input: ClearanceInput, rng: Rng): Resolution<ClearanceOutcome> => {
  const target = aim(input);
  if (rng.next() < outChance(input)) {
    const inside = {
      x: clamp(target.x, 0, PITCH_LENGTH),
      y: clamp(target.y, 0, PITCH_WIDTH),
    };
    const restart = restartAfterOutOfPlay(input.side, exitPoint(input.from, inside));
    return {
      outcome: "outOfPlay",
      ball: restart.position,
      possession: { side: restart.team },
      restart,
    };
  }
  const landing = { x: clamp(target.x, 0, PITCH_LENGTH), y: clamp(target.y, 0, PITCH_WIDTH) };
  const other: Side = input.side === "home" ? "away" : "home";
  const candidates = [
    ...input.teammates.map((c) => ({ c, side: input.side })),
    ...input.opponents.map((c) => ({ c, side: other })),
  ];
  const first = candidates.reduce<(typeof candidates)[number] | undefined>(
    (best, cand) =>
      best === undefined || reach(landing, cand.c) < reach(landing, best.c) ? cand : best,
    undefined,
  );
  return {
    outcome: "kept",
    ball: landing,
    possession:
      first === undefined ? { side: input.side } : { side: first.side, slot: first.c.slot },
  };
};
