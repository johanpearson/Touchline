import type { Side } from "../match-state";
import type { Rng } from "../rng";
import type { ShotOutcome } from "./action-event";
import { clamp, rating } from "./attribute-rating";
import {
  BLOCK_CORNER_SHARE,
  BLOCKED_WEIGHT_PER_BLOCKER,
  FINISHING_GOAL_GAIN,
  GOAL_CHANCE_MAX,
  KEEPER_GOAL_GAIN,
  MISSED_WEIGHT,
  REBOUND_DISTANCE,
  SAVE_CATCH_SHARE,
  SAVE_CORNER_SHARE,
  SAVED_WEIGHT,
  SHOT_BLOCK_RADIUS,
  WOODWORK_WEIGHT,
} from "./decision-constants";
import type { EnginePlayer } from "./engine-player";
import type { Challenger, Resolution } from "./open-play-types";
import { restartAfterOutOfPlay } from "./out-of-play";
import { PITCH_LENGTH, PITCH_WIDTH, type Point } from "./pitch-metres";
import { distanceToSegment } from "./segment-distance";

export type ShotInput = {
  /** The shooter's side. */
  side: Side;
  shooter: EnginePlayer;
  shooterSlot: number;
  from: Point;
  /** The defending goalkeeper. */
  keeper: Challenger;
  /** The defending outfield players with their positions; those near the shot lane can block it. */
  blockers: readonly Challenger[];
  /** The shot's expected goals (`PENALTY_XG` for a penalty). */
  xg: number;
  /** Pressure on the shooter, 0..1: hurried shots are missed more often. */
  pressure: number;
  /** A penalty cannot be blocked. */
  penalty?: boolean;
};

const other = (side: Side): Side => (side === "home" ? "away" : "home");
const goalLineX = (side: Side): number => (side === "home" ? PITCH_LENGTH : 0);
const keeperSkill = (keeper: EnginePlayer): number =>
  (rating(keeper, "handling") + rating(keeper, "reflexes")) / 2;

/** Chance the shot is a goal: xG, raised by finishing, lowered by the keeper's handling and reflexes. */
export const goalChance = (input: ShotInput): number => {
  const finishing = 1 + FINISHING_GOAL_GAIN * (rating(input.shooter, "finishing") - 0.5);
  const keeping = 1 - KEEPER_GOAL_GAIN * (keeperSkill(input.keeper.player) - 0.5);
  return clamp(input.xg * finishing * keeping, 0, GOAL_CHANCE_MAX);
};

const laneBlockers = (input: ShotInput): Challenger[] => {
  if (input.penalty === true) return [];
  const goal = { x: goalLineX(input.side), y: PITCH_WIDTH / 2 };
  return input.blockers.filter(
    (b) => distanceToSegment(b.point, input.from, goal) <= SHOT_BLOCK_RADIUS,
  );
};

const distance = (a: Point, b: Point): number => Math.hypot(a.x - b.x, a.y - b.y);

const nearestTo = (point: Point, candidates: readonly Challenger[]): Challenger | undefined =>
  candidates.reduce<Challenger | undefined>(
    (best, c) =>
      best === undefined || distance(c.point, point) < distance(best.point, point) ? c : best,
    undefined,
  );

type Remainder = { woodwork: number; blocked: number; saved: number; missed: number };

/** Weights that split the non-goal remainder; blocks need a blocker on the lane. */
const remainderWeights = (input: ShotInput, blockers: readonly Challenger[]): Remainder => ({
  woodwork: WOODWORK_WEIGHT,
  blocked: BLOCKED_WEIGHT_PER_BLOCKER * blockers.length,
  saved: SAVED_WEIGHT * (0.5 + keeperSkill(input.keeper.player)),
  missed: MISSED_WEIGHT * (1.5 - rating(input.shooter, "finishing")) * (1 + input.pressure),
});

const pickRemainder = (weights: Remainder, v: number): Exclude<ShotOutcome, "goal"> => {
  const total = weights.woodwork + weights.blocked + weights.saved + weights.missed;
  const target = v * total;
  if (target < weights.woodwork) return "woodwork";
  if (target < weights.woodwork + weights.blocked) return "blocked";
  if (target < weights.woodwork + weights.blocked + weights.saved) return "saved";
  return "missed";
};

const cornerFor = (input: ShotInput): Resolution<ShotOutcome>["restart"] =>
  restartAfterOutOfPlay(other(input.side), {
    point: { x: goalLineX(input.side), y: input.from.y },
    boundary: "endLine",
  });

const withCorner = (outcome: ShotOutcome, input: ShotInput): Resolution<ShotOutcome> => {
  const restart = cornerFor(input);
  return {
    outcome,
    ball: restart?.position ?? input.from,
    possession: { side: input.side },
    restart,
  };
};

/** A loose ball in front of the goal: the nearest of the shooter and the defenders gets it. */
const rebound = (outcome: ShotOutcome, input: ShotInput): Resolution<ShotOutcome> => {
  const direction = input.side === "home" ? -1 : 1;
  const ball = {
    x: goalLineX(input.side) + direction * REBOUND_DISTANCE,
    y: PITCH_WIDTH / 2 + (input.from.y - PITCH_WIDTH / 2) / 2,
  };
  const shooter: Challenger = { slot: input.shooterSlot, player: input.shooter, point: input.from };
  const defender = nearestTo(ball, input.blockers);
  const winner =
    defender !== undefined && distance(defender.point, ball) < distance(input.from, ball)
      ? { side: other(input.side), slot: defender.slot }
      : { side: input.side, slot: shooter.slot };
  return { outcome, ball, possession: winner };
};

const save = (input: ShotInput, rng: Rng): Resolution<ShotOutcome> => {
  const v = rng.next();
  if (v < SAVE_CORNER_SHARE) return withCorner("saved", input);
  if (v < SAVE_CATCH_SHARE) {
    return {
      outcome: "saved",
      ball: input.keeper.point,
      possession: { side: other(input.side), slot: input.keeper.slot },
    };
  }
  return rebound("saved", input);
};

const block = (
  input: ShotInput,
  blockers: readonly Challenger[],
  rng: Rng,
): Resolution<ShotOutcome> => {
  if (rng.next() < BLOCK_CORNER_SHARE) return withCorner("blocked", input);
  const blocker = nearestTo(input.from, blockers) as Challenger;
  return {
    outcome: "blocked",
    ball: blocker.point,
    possession: { side: other(input.side), slot: blocker.slot },
  };
};

const goalKick = (input: ShotInput): Resolution<ShotOutcome> => {
  const restart = restartAfterOutOfPlay(input.side, {
    point: { x: goalLineX(input.side), y: input.from.y },
    boundary: "endLine",
  });
  return {
    outcome: "missed",
    ball: restart.position,
    possession: { side: restart.team },
    restart,
  };
};

/**
 * Resolves a shot. The first draw picks the class: below `goalChance` it is a goal, the rest of the
 * range is split between woodwork, blocked, saved and missed (so the goal share is exactly the goal
 * chance). A save or a block draws once more for corner, catch/loose ball or rebound. Goal: the
 * conceding side restarts from the centre (the match loop adds the kickoff). Miss: goal kick.
 * Woodwork: a rebound. Draws: one, plus one for a save or block.
 */
export const resolveShot = (input: ShotInput, rng: Rng): Resolution<ShotOutcome> => {
  const chance = goalChance(input);
  const u = rng.next();
  if (u < chance) {
    return {
      outcome: "goal",
      ball: { x: goalLineX(input.side), y: PITCH_WIDTH / 2 },
      possession: { side: other(input.side) },
    };
  }
  const blockers = laneBlockers(input);
  const remainder = (u - chance) / (1 - chance);
  switch (pickRemainder(remainderWeights(input, blockers), remainder)) {
    case "woodwork":
      return rebound("woodwork", input);
    case "blocked":
      return block(input, blockers, rng);
    case "saved":
      return save(input, rng);
    default:
      return goalKick(input);
  }
};
