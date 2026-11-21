import { clamp, rating } from "../action/attribute-rating";
import type { EnginePlayer } from "../action/engine-player";
import { goalChanceOf, shotStoppingSkill } from "../action/resolve-shot";
import type { Rng } from "../rng";
import type { Chance, ChanceAftermath, ChanceResult } from "./chance";
import {
  AFTERMATH_ORDER,
  AFTERMATH_SHARES,
  BLOCKED_WEIGHT,
  OVER_WEIGHT,
  PRESSURE_MISS_GAIN,
  SAVED_WEIGHT,
  SITUATION_PRESSURE,
  WIDE_WEIGHT,
  WOODWORK_WEIGHT,
} from "./chance-constants";

/** A chance before its shot: everything but the result and what follows. */
export type ChanceDraft = Omit<Chance, "result" | "aftermath">;

export type ChanceResolution = { result: ChanceResult; aftermath: ChanceAftermath };

type Miss = Exclude<ChanceResult, "goal">;

/** Weights of the non-goal results of a shot; every class keeps a positive weight except a block that cannot happen. */
export const missWeights = (
  draft: ChanceDraft,
  shooter: EnginePlayer,
  keeper: EnginePlayer,
): Record<Miss, number> => {
  const poor = 1.5 - rating(shooter, "finishing");
  const hurried = 1 + PRESSURE_MISS_GAIN * SITUATION_PRESSURE[draft.situation];
  return {
    woodwork: WOODWORK_WEIGHT,
    blocked: draft.kind === "penalty" ? 0 : BLOCKED_WEIGHT[draft.situation],
    saved: SAVED_WEIGHT * (0.5 + shotStoppingSkill(keeper)),
    wide: WIDE_WEIGHT * poor * hurried,
    over: OVER_WEIGHT * poor * hurried,
  };
};

const MISS_ORDER: readonly Miss[] = ["woodwork", "blocked", "saved", "wide", "over"];

const pickMiss = (weights: Record<Miss, number>, v: number): Miss => {
  const total = MISS_ORDER.reduce((sum, key) => sum + weights[key], 0);
  let target = v * total;
  for (const key of MISS_ORDER) {
    target -= weights[key];
    if (target < 0) return key;
  }
  return "over";
};

const pickAftermath = (result: Miss, rng: Rng): ChanceAftermath => {
  const shares = AFTERMATH_SHARES[result];
  let target = rng.next();
  for (const [index, share] of shares.entries()) {
    target -= share;
    if (target < 0) return AFTERMATH_ORDER[index] as ChanceAftermath;
  }
  return "goalKick";
};

/**
 * One result ladder for a shot. The first draw picks goal or not: below `goalChanceOf` (xG times the
 * finishing and keeper factors) it is a goal, so the goal share equals that chance exactly. The rest of
 * the range is split between woodwork, blocked, saved, wide and over (`missWeights`). A miss draws once
 * more for what follows (rebound, corner, goal kick); a goal restarts with a kickoff. Draws: 1, or 2.
 */
export const resolveChance = (
  draft: ChanceDraft,
  shooter: EnginePlayer,
  keeper: EnginePlayer,
  rng: Rng,
): ChanceResolution => {
  const goal = clamp(goalChanceOf(draft.xg, shooter, keeper), 0, 1);
  const u = rng.next();
  if (u < goal) return { result: "goal", aftermath: "kickoff" };
  const result = pickMiss(missWeights(draft, shooter, keeper), (u - goal) / (1 - goal));
  return { result, aftermath: pickAftermath(result, rng) };
};
