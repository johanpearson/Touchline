import { rating } from "../action/attribute-rating";
import type { EngineAttributeName, EnginePlayer } from "../action/engine-player";
import { PITCH_WIDTH, type Point } from "../action/pitch-metres";
import { toAttackingFrame } from "../action/shot-xg";
import type { TeamSheet } from "../action/team-sheet";
import type { Side } from "../match-state";
import type { Rng } from "../rng";
import {
  POSITION_WEIGHT,
  SHOT_DEPTH_MAX,
  SHOT_DEPTH_MIN,
  STAGE_END_DEPTH,
  STAGE_START_LIMITS,
  type Stage,
} from "./phase-constants";
import type { ChainLink, PhaseStart } from "./phase-step";

const LATERAL_JITTER = 14;
const DEPTH_JITTER = 4;
const SHOOTING_BAND = { min: 22, max: 46 };
const MARGIN = 1;

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

/** The stage a possession starts in, from the ball's depth in the attacker's frame. */
export const startStage = (depth: number): Stage =>
  depth < STAGE_START_LIMITS[0] ? 0 : depth < STAGE_START_LIMITS[1] ? 1 : 2;

/** Picks an item with probability proportional to its weight; a list without weight picks the first. */
const pickWeighted = <T>(items: readonly T[], weight: (item: T) => number, rng: Rng): T => {
  const weights = items.map(weight);
  const total = weights.reduce((sum, w) => sum + w, 0);
  let draw = rng.next() * total;
  for (const [index, w] of weights.entries()) {
    draw -= w;
    if (draw < 0) return items[index] as T;
  }
  return items[0] as T;
};

/** An outfield player of `sheet` who joins a possession in `stage`, never `exclude`, weighted by `attribute`. */
export const pickPlayer = (
  sheet: TeamSheet,
  stage: Stage,
  attribute: EngineAttributeName,
  exclude: string | undefined,
  rng: Rng,
): EnginePlayer => {
  const pool = sheet.starters.filter(
    (p) => p.id !== exclude && POSITION_WEIGHT[stage][p.position] > 0,
  );
  return pickWeighted(
    pool.length > 0 ? pool : sheet.starters.slice(1),
    (p) => POSITION_WEIGHT[stage][p.position] * rating(p, attribute),
    rng,
  );
};

/** An outfield defender-side player who challenges, weighted by tackling. */
export const pickChallenger = (sheet: TeamSheet, stage: Stage, rng: Rng): string =>
  pickPlayer(sheet, stage === 0 ? 2 : stage === 2 ? 0 : 1, "tackling", undefined, rng).id;

type ChainPlan = {
  team: Side;
  sheet: TeamSheet;
  start: PhaseStart;
  ball: Point;
  /** The stage the possession starts in and the one it ends in (3 when it gets through all of them). */
  from: Stage;
  endedIn: Stage | 3;
  /** The possession ends in a shot, so its last link is the shooter on the edge of the box. */
  shoots: boolean;
};

const linkCount = (plan: ChainPlan, rng: Rng): number => {
  const gained = plan.endedIn - plan.from;
  return clamp(rng.int(2 + gained, 3 + gained), 2, 6);
};

const endDepth = (plan: ChainPlan, rng: Rng): number =>
  plan.shoots
    ? SHOT_DEPTH_MIN + rng.next() * (SHOT_DEPTH_MAX - SHOT_DEPTH_MIN)
    : STAGE_END_DEPTH[Math.min(plan.endedIn, 2) as Stage] - rng.next() * 25;

const waypoint = (from: Point, to: Point, share: number, rng: Rng): Point => ({
  x: clamp(from.x + (to.x - from.x) * share + (rng.next() - 0.5) * DEPTH_JITTER, MARGIN, 104),
  y: clamp(
    from.y + (to.y - from.y) * share + (rng.next() - 0.5) * LATERAL_JITTER,
    MARGIN,
    PITCH_WIDTH - MARGIN,
  ),
});

/**
 * The players of the possession in order, with the ball path from `plan.ball` to where it ends
 * (in the attacker's frame the path only ever moves forward on average). The first link is the taker
 * of the restart (the goalkeeper for a goal kick), the last the shooter, the fouled player or the
 * one who loses the ball.
 */
export const drawChain = (plan: ChainPlan, rng: Rng): [ChainLink, ...ChainLink[]] => {
  const flip = (p: Point): Point => toAttackingFrame(plan.team, p);
  const start = flip(plan.ball);
  const count = linkCount(plan, rng);
  const lastDepth = Math.max(start.x, endDepth(plan, rng));
  const target: Point = {
    x: lastDepth,
    y: plan.shoots
      ? SHOOTING_BAND.min + rng.next() * (SHOOTING_BAND.max - SHOOTING_BAND.min)
      : rng.next() * PITCH_WIDTH,
  };
  const first: EnginePlayer =
    plan.start === "goalKick"
      ? (plan.sheet.starters[0] as EnginePlayer)
      : pickPlayer(plan.sheet, plan.from, "passing", undefined, rng);
  const links: ChainLink[] = [{ player: first.id, at: plan.ball }];
  for (let i = 1; i < count; i++) {
    const last = i === count - 1;
    const share = i / (count - 1);
    const at = last ? target : waypoint(start, target, share, rng);
    const stage = startStage(at.x);
    const player = pickPlayer(
      plan.sheet,
      stage,
      last && plan.shoots ? "finishing" : "passing",
      links[i - 1]?.player,
      rng,
    );
    links.push({ player: player.id, at: flip(at) });
  }
  return links as [ChainLink, ...ChainLink[]];
};
