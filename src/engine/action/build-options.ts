import type { Side } from "../match-state";
import type { TeamTactics } from "../tactics";
import type { PassVariant } from "./action-event";
import { clamp, rating } from "./attribute-rating";
import {
  ACTOR_PRESSURE_RISK_PENALTY,
  BACKWARD_ANGLE_FACTOR,
  BASE_DIRECTNESS,
  CARRY_BASE_WEIGHT,
  CARRY_DIRECTNESS_GAIN,
  CARRY_DISTANCE,
  CARRY_SPACE_PENALTY,
  CLEARANCE_BASE_WEIGHT,
  CLEARANCE_DANGER_DEPTH,
  CLEARANCE_SAFE_FACTOR,
  CROSS_MIN_DEPTH,
  CROSS_WIDE_CHANNEL,
  GOALKEEPER_CARRY_FACTOR,
  LONG_PASS_MIN,
  MENTALITY_DIRECTNESS,
  MENTALITY_RISK,
  MENTALITY_SHOT,
  PASS_BASE_WEIGHT,
  PASS_DISTANCE_SCALE,
  PROGRESS_FACTOR_MAX,
  PROGRESS_FACTOR_MIN,
  PROGRESS_SCALE,
  RISKY_VARIANTS,
  SHORT_PASS_MAX,
  SHOT_FINISHING_GAIN,
  SHOT_MIN_XG,
  SHOT_WEIGHT_GAIN,
  TARGET_PRESSURE_PENALTY,
  TEMPO_DIRECTNESS,
  THROUGH_PASS_MIN_DISTANCE,
  THROUGH_PASS_MIN_PROGRESS,
  WIDE_TARGET_CHANNEL,
  WIDTH_WIDE_BONUS,
} from "./decision-constants";
import type { EnginePlayer } from "./engine-player";
import { PITCH_LENGTH, PITCH_WIDTH, type Point } from "./pitch-metres";
import { pressureOn, type Shapes } from "./pressure";
import { shotXg, toAttackingFrame } from "./shot-xg";

/** The ball carrier: their side, their slot in `shapes[side]` and their side's players in slot order. */
export type ActorContext = { side: Side; slot: number; players: readonly EnginePlayer[] };

export type PassOption = {
  type: "pass";
  variant: PassVariant;
  /** Slot of the intended receiver. */
  target: number;
  from: Point;
  to: Point;
  weight: number;
};
export type CarryOption = { type: "carry"; from: Point; to: Point; weight: number };
export type ClearanceOption = { type: "clearance"; from: Point; weight: number };
/** A shot at the goal centre; `xg` is the shot's expected goals. */
export type ShotOption = { type: "shot"; from: Point; to: Point; xg: number; weight: number };
export type ActionOption = PassOption | CarryOption | ClearanceOption | ShotOption;

const attackDirection = (side: Side): 1 | -1 => (side === "home" ? 1 : -1);
const depthOf = (side: Side, point: Point): number =>
  side === "home" ? point.x : PITCH_LENGTH - point.x;
const isWide = (point: Point, channel: number): boolean =>
  point.y < channel || point.y > PITCH_WIDTH - channel;
const finiteOrZero = (value: number): number => (Number.isFinite(value) ? Math.max(0, value) : 0);

const passVariant = (side: Side, from: Point, to: Point): PassVariant => {
  const distance = Math.hypot(to.x - from.x, to.y - from.y);
  const progress = (to.x - from.x) * attackDirection(side);
  if (isWide(to, CROSS_WIDE_CHANNEL) && depthOf(side, to) >= CROSS_MIN_DEPTH) return "cross";
  if (distance >= LONG_PASS_MIN) return "long";
  if (progress >= THROUGH_PASS_MIN_PROGRESS && distance >= THROUGH_PASS_MIN_DISTANCE) {
    return "through";
  }
  return distance <= SHORT_PASS_MAX ? "short" : "long";
};

const passWeight = (
  actor: EnginePlayer,
  variant: PassVariant,
  from: Point,
  to: Point,
  side: Side,
  pressure: number,
  shapes: Shapes,
  tactics: TeamTactics,
): number => {
  const distance = Math.hypot(to.x - from.x, to.y - from.y);
  const progress = (to.x - from.x) * attackDirection(side);
  const directness =
    BASE_DIRECTNESS + TEMPO_DIRECTNESS[tactics.tempo] + MENTALITY_DIRECTNESS[tactics.mentality];
  const vision = variant === "short" ? 0 : rating(actor, "vision") * 0.3;
  const skill = 0.5 + rating(actor, "passing") * 0.5 + vision;
  const progressFactor = clamp(
    1 + (directness * progress) / PROGRESS_SCALE,
    PROGRESS_FACTOR_MIN,
    PROGRESS_FACTOR_MAX,
  );
  const forwardness = distance === 0 ? 0 : progress / distance;
  const angleFactor = BACKWARD_ANGLE_FACTOR + (1 - BACKWARD_ANGLE_FACTOR) * ((forwardness + 1) / 2);
  const space = 1 - TARGET_PRESSURE_PENALTY * pressureOn(to, side, shapes);
  const risky = RISKY_VARIANTS.includes(variant);
  const risk = risky
    ? MENTALITY_RISK[tactics.mentality] * (1 - ACTOR_PRESSURE_RISK_PENALTY * pressure)
    : 1;
  const wide =
    isWide(to, WIDE_TARGET_CHANNEL) || variant === "cross" ? WIDTH_WIDE_BONUS[tactics.width] : 1;
  return finiteOrZero(
    PASS_BASE_WEIGHT *
      skill *
      Math.exp(-distance / PASS_DISTANCE_SCALE) *
      progressFactor *
      angleFactor *
      space *
      risk *
      wide,
  );
};

const carryTarget = (side: Side, from: Point): Point => ({
  x: clamp(from.x + attackDirection(side) * CARRY_DISTANCE, 0, PITCH_LENGTH),
  y: from.y,
});

const carryOption = (
  actor: EnginePlayer,
  side: Side,
  from: Point,
  pressure: number,
  shapes: Shapes,
  tactics: TeamTactics,
): CarryOption => {
  const to = carryTarget(side, from);
  const directness = TEMPO_DIRECTNESS[tactics.tempo] + MENTALITY_DIRECTNESS[tactics.mentality];
  const keeper = actor.position === "GK" ? GOALKEEPER_CARRY_FACTOR : 1;
  const weight =
    CARRY_BASE_WEIGHT *
    (0.4 + 0.6 * rating(actor, "dribbling")) *
    (1 - ACTOR_PRESSURE_RISK_PENALTY * pressure) *
    (1 - CARRY_SPACE_PENALTY * pressureOn(to, side, shapes)) *
    (1 + CARRY_DIRECTNESS_GAIN * directness) *
    keeper;
  return { type: "carry", from, to, weight: finiteOrZero(weight) };
};

const clearanceOption = (side: Side, from: Point, pressure: number): ClearanceOption => {
  const zone = depthOf(side, from) < CLEARANCE_DANGER_DEPTH ? 1 : CLEARANCE_SAFE_FACTOR;
  return {
    type: "clearance",
    from,
    weight: finiteOrZero(CLEARANCE_BASE_WEIGHT * pressure ** 2 * zone),
  };
};

const shotOption = (
  actor: EnginePlayer,
  side: Side,
  from: Point,
  pressure: number,
  tactics: TeamTactics,
): ShotOption => {
  const xg = shotXg(toAttackingFrame(side, from), pressure);
  const finishing = 1 + SHOT_FINISHING_GAIN * 2 * (rating(actor, "finishing") - 0.5);
  const weight =
    xg < SHOT_MIN_XG ? 0 : SHOT_WEIGHT_GAIN * xg * finishing * MENTALITY_SHOT[tactics.mentality];
  const to = { x: side === "home" ? PITCH_LENGTH : 0, y: PITCH_WIDTH / 2 };
  return { type: "shot", from, to, xg, weight: finiteOrZero(weight) };
};

/**
 * Everything the ball carrier can do: a pass to each teammate, a carry, a
 * clearance and a shot, each with a weight from attributes, geometry, pressure and tactics.
 */
export const buildOptions = (
  actor: ActorContext,
  shapes: Shapes,
  tactics: TeamTactics,
): ActionOption[] => {
  const own = shapes[actor.side];
  const from = own[actor.slot] as Point;
  const player = actor.players[actor.slot] as EnginePlayer;
  const pressure = pressureOn(from, actor.side, shapes);
  const passes = own.flatMap((to, target): PassOption[] => {
    if (target === actor.slot) return [];
    const variant = passVariant(actor.side, from, to);
    const weight = passWeight(player, variant, from, to, actor.side, pressure, shapes, tactics);
    return [{ type: "pass", variant, target, from, to, weight }];
  });
  return [
    ...passes,
    carryOption(player, actor.side, from, pressure, shapes, tactics),
    clearanceOption(actor.side, from, pressure),
    shotOption(player, actor.side, from, pressure, tactics),
  ];
};
