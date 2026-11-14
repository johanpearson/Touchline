import type { Side } from "../match-state";
import type { Rng } from "../rng";
import type { CarryOutcome } from "./action-event";
import { clamp, rating } from "./attribute-rating";
import {
  CARRY_DEFENDER_PENALTY,
  CARRY_KEPT_BASE,
  CARRY_KEPT_MAX,
  CARRY_KEPT_MIN,
  CARRY_OUT_MARGIN,
  CARRY_OUT_SHARE,
  CARRY_PRESSURE_PENALTY,
  CARRY_SKILL_GAIN,
} from "./decision-constants";
import type { EnginePlayer } from "./engine-player";
import type { Challenger, Resolution } from "./open-play-types";
import { exitPoint, restartAfterOutOfPlay } from "./out-of-play";
import { PITCH_LENGTH, PITCH_WIDTH, type Point } from "./pitch-metres";

export type CarryInput = {
  side: Side;
  carrier: EnginePlayer;
  carrierSlot: number;
  from: Point;
  to: Point;
  /** Pressure on the carrier, 0..1. */
  pressure: number;
  /** The nearest opponent, if any. */
  defender?: Challenger;
  /** The defending side's press and the carrier's home advantage, net (added to the kept chance); 0 when absent. */
  keptBonus?: number;
};

const nearLine = (p: Point): boolean =>
  Math.min(p.y, PITCH_WIDTH - p.y, p.x, PITCH_LENGTH - p.x) < CARRY_OUT_MARGIN;

export const carryKeptChance = (input: CarryInput): number => {
  const skill = 0.6 * rating(input.carrier, "dribbling") + 0.4 * rating(input.carrier, "pace");
  const defence = input.defender
    ? 0.6 * rating(input.defender.player, "tackling") + 0.4 * rating(input.defender.player, "pace")
    : 0;
  return clamp(
    CARRY_KEPT_BASE +
      CARRY_SKILL_GAIN * (skill - 0.5) -
      CARRY_DEFENDER_PENALTY * defence -
      CARRY_PRESSURE_PENALTY * input.pressure +
      (input.keptBonus ?? 0),
    CARRY_KEPT_MIN,
    CARRY_KEPT_MAX,
  );
};

const other = (side: Side): Side => (side === "home" ? "away" : "home");

/**
 * A dribble ends `kept`, `tackled` (the nearest defender wins it halfway) or `outOfPlay` (only
 * within `CARRY_OUT_MARGIN` of a line). Without a defender and away from the lines it cannot fail.
 * Draws: kept, then, on failure, which kind of failure (only when both are possible).
 */
export const resolveCarry = (input: CarryInput, rng: Rng): Resolution<CarryOutcome> => {
  const { side, from, to, defender } = input;
  const kept: Resolution<CarryOutcome> = {
    outcome: "kept",
    ball: to,
    possession: { side, slot: input.carrierSlot },
  };
  if (rng.next() < carryKeptChance(input)) return kept;
  const canGoOut = nearLine(to);
  if (defender === undefined && !canGoOut) return kept;
  const goesOut = canGoOut && (defender === undefined || rng.next() < CARRY_OUT_SHARE);
  if (goesOut) {
    const restart = restartAfterOutOfPlay(side, exitPoint(from, to));
    return {
      outcome: "outOfPlay",
      ball: restart.position,
      possession: { side: restart.team },
      restart,
    };
  }
  return {
    outcome: "tackled",
    ball: { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 },
    possession: { side: other(side), slot: (defender as Challenger).slot },
  };
};
