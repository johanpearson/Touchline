import { PENALTY_XG } from "../action/decision-constants";
import { PITCH_LENGTH, PITCH_WIDTH, type Point } from "../action/pitch-metres";
import { type BodyPart, shotXg, toAttackingFrame } from "../action/shot-xg";
import type { Side } from "../match-state";
import type { Rng } from "../rng";
import type { ChanceKind, ChanceSituation } from "./chance";
import {
  COUNTER_MAX_LINKS,
  COUNTER_MAX_START_DEPTH,
  CROSS_MIN_DEPTH,
  CUT_BACK_MIN_DEPTH,
  EDGE_DISTANCE,
  KIND_WEIGHT,
  KIND_XG_FACTOR,
  MAX_CHANCE_XG,
  MIN_CHANCE_XG,
  ONE_ON_ONE_MIN_XG,
  SITUATION_PRESSURE,
  SITUATION_SHARES,
  SITUATION_XG_FACTOR,
  SITUATIONS,
  THROUGH_BALL_MIN_GAIN,
  WIDE_CHANNEL,
  XG_SCALE,
} from "./chance-constants";
import type { ChainLink, PhaseStart } from "./phase-step";
import type { ChanceDraft } from "./resolve-chance";

/** What `drawChance` needs: the possession's side, how it started, its chain and the keeper it faces. */
export type ChanceInput = {
  team: Side;
  start: PhaseStart;
  /** The ball's position when the possession started, in metres. */
  ball: Point;
  chain: readonly ChainLink[];
  keeper: string;
};

type OpenKind = keyof typeof KIND_WEIGHT;

const depthOf = (team: Side, at: Point): number => toAttackingFrame(team, at).x;
const wideOf = (team: Side, at: Point): number =>
  Math.abs(toAttackingFrame(team, at).y - PITCH_WIDTH / 2);

/** The open-play kinds the geometry of the last pass allows, each once. */
const allowedKinds = (input: ChanceInput, creator: ChainLink, shooter: ChainLink): OpenKind[] => {
  const { team, start, chain } = input;
  const wide = wideOf(team, creator.at) >= WIDE_CHANNEL;
  const depth = depthOf(team, creator.at);
  const kinds: OpenKind[] = ["openPlay"];
  if (wide && depth >= CROSS_MIN_DEPTH) kinds.push("cross");
  if (wide && depth >= CUT_BACK_MIN_DEPTH) kinds.push("cutBack");
  if (depthOf(team, shooter.at) - depth >= THROUGH_BALL_MIN_GAIN) kinds.push("throughBall");
  const won = start === "tackle" || start === "interception";
  if (
    won &&
    depthOf(team, input.ball) < COUNTER_MAX_START_DEPTH &&
    chain.length <= COUNTER_MAX_LINKS
  ) {
    kinds.push("counter");
  }
  return kinds;
};

/** The kind of the chance: fixed by a penalty, a corner or a direct free kick, otherwise one weighted draw. */
export const drawKind = (input: ChanceInput, rng: Rng): ChanceKind => {
  if (input.start === "penalty") return "penalty";
  if (input.start === "corner") return "setPiece";
  if (input.start === "freeKick") return input.chain.length === 1 ? "freeKick" : "setPiece";
  const shooter = input.chain[input.chain.length - 1] as ChainLink;
  const creator = input.chain[input.chain.length - 2] ?? shooter;
  const kinds = allowedKinds(input, creator, shooter);
  const total = kinds.reduce((sum, kind) => sum + KIND_WEIGHT[kind], 0);
  let target = rng.next() * total;
  for (const kind of kinds) {
    target -= KIND_WEIGHT[kind];
    if (target < 0) return kind;
  }
  return "openPlay";
};

const distanceToGoal = (team: Side, at: Point): number => {
  const local = toAttackingFrame(team, at);
  return Math.hypot(PITCH_LENGTH - local.x, PITCH_WIDTH / 2 - local.y);
};

/** The situation of the shot: one draw from the kind's shares; an unspecific shot from far out is from the edge. */
export const drawSituation = (kind: ChanceKind, distance: number, rng: Rng): ChanceSituation => {
  if (kind === "penalty") return "oneOnOne";
  if (kind === "freeKick") return "edge";
  let target = rng.next();
  for (const [index, share] of SITUATION_SHARES[kind].entries()) {
    target -= share;
    if (target < 0) {
      const situation = SITUATIONS[index] as ChanceSituation;
      return situation === "box" && distance >= EDGE_DISTANCE ? "edge" : situation;
    }
  }
  return "box";
};

/** Expected goals of the shot from where it is taken: the base model, the situation's pressure and factors. */
export const chanceXg = (
  kind: ChanceKind,
  situation: ChanceSituation,
  team: Side,
  from: Point,
): number => {
  if (kind === "penalty") return PENALTY_XG;
  const body: BodyPart = situation === "header" ? "head" : "foot";
  const base = shotXg(toAttackingFrame(team, from), SITUATION_PRESSURE[situation], body);
  const factor = XG_SCALE * SITUATION_XG_FACTOR[situation] * KIND_XG_FACTOR[kind];
  const floor = situation === "oneOnOne" ? ONE_ON_ONE_MIN_XG : MIN_CHANCE_XG;
  return Math.min(MAX_CHANCE_XG, Math.max(floor, base * factor));
};

/**
 * Draws the chance a possession created: its kind, who made it (the last passer of the chain, the
 * taker of a corner) and who takes it (the last player of the chain, weighted by finishing when the
 * chain was drawn), the situation and the expected goals. Draws: kind (0 or 1), situation (0 or 1).
 * The result and what follows come from `resolveChance`.
 */
export const drawChance = (input: ChanceInput, rng: Rng): ChanceDraft => {
  const shooter = input.chain[input.chain.length - 1] as ChainLink;
  const creator = input.chain[input.chain.length - 2] ?? shooter;
  const kind = drawKind(input, rng);
  const situation = drawSituation(kind, distanceToGoal(input.team, shooter.at), rng);
  return {
    kind,
    creator: creator.player,
    shooter: shooter.player,
    situation,
    xg: chanceXg(kind, situation, input.team, shooter.at),
    keeper: input.keeper,
    from: { ...shooter.at },
  };
};
