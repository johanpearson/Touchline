import type { Pressing, TeamTactics, Tempo } from "../tactics";
import { rating } from "./attribute-rating";
import {
  ENGINE_ATTRIBUTE_NAMES,
  type EngineAttributes,
  type EnginePlayer,
  type EnginePosition,
} from "./engine-player";

/**
 * In-match energy: every player on the pitch starts at `ENERGY_START` and loses energy for each match
 * minute played. Tired players are worse: each attribute is scaled by `energyFactor`. Kickoff fitness
 * (a `game` concept) already acts through the attributes the engine is given, so energy starts at
 * 100 for everyone and fitness is never counted twice. No randomness is involved.
 */
export const ENERGY_START = 100;

/** Energy lost per match minute by a player with a neutral work rate, role and tactics. */
export const BASE_DRAIN = 0.45;

/** The share of an attribute a player with no energy left loses. A tired player is worse, never useless. */
export const MAX_ENERGY_PENALTY = 0.3;

/** The penalty grows with the square of the energy spent, so it stays small until about half is gone. */
export const ENERGY_PENALTY_EXPONENT = 2;

/**
 * Drain factor of a player by work rate: `WORK_RATE_DRAIN_BASE` at 0, 1 at 10, 1.2 at 20. Kept gentle: a
 * steeper slope made hard-working (usually stronger) squads tire most and flattened the league.
 */
const WORK_RATE_DRAIN_BASE = 0.8;
const WORK_RATE_DRAIN_SPREAD = 0.4;

const PRESSING_DRAIN: Record<Pressing, number> = { low: 0.9, medium: 1, high: 1.2 };
const TEMPO_DRAIN: Record<Tempo, number> = { slow: 0.92, normal: 1, fast: 1.12 };
const ROLE_DRAIN: Record<EnginePosition, number> = { GK: 0.25, DEF: 0.95, MID: 1.1, FWD: 1 };

/** The scale (0 to 1) every attribute of a player with `energy` is multiplied by. */
export const energyFactor = (energy: number): number =>
  1 - MAX_ENERGY_PENALTY * (1 - energy / ENERGY_START) ** ENERGY_PENALTY_EXPONENT;

/** Energy a player loses per match minute: more work rate, pressing and tempo cost more, goalkeepers least. */
export const drainPerMinute = (player: EnginePlayer, tactics: TeamTactics): number =>
  BASE_DRAIN *
  (WORK_RATE_DRAIN_BASE + WORK_RATE_DRAIN_SPREAD * rating(player, "workRate")) *
  PRESSING_DRAIN[tactics.pressing] *
  TEMPO_DRAIN[tactics.tempo] *
  ROLE_DRAIN[player.position];

/** The player as he plays with `energy` left: every attribute scaled. Full energy returns the same player. */
export const withEnergy = (player: EnginePlayer, energy: number): EnginePlayer => {
  if (energy >= ENERGY_START) return player;
  const factor = energyFactor(energy);
  const attributes = Object.fromEntries(
    ENGINE_ATTRIBUTE_NAMES.map((name) => [name, player.attributes[name] * factor]),
  ) as EngineAttributes;
  return { ...player, attributes };
};
