import { createRng } from "../engine";
import { initialContracts, initialFinances, initialMinutes } from "./initial-economy";
import { isInt, isIntInRange, isRecord, isString, type Rec } from "./json-guards";
import { parseLeague } from "./parse-league";
import { ATTRIBUTE_NAMES, MAX_ATTRIBUTE, MIN_ATTRIBUTE, type PlayerAttributes } from "./player";
import { overallIn } from "./player-overall";
import { potentialFor } from "./potential";
import type { PlayerPosition } from "./squad-player";

const POSITIONS: readonly unknown[] = ["GK", "DEF", "MID", "FWD"];

const hasAttributes = (raw: Rec): boolean =>
  ATTRIBUTE_NAMES.every((name) => isIntInRange(raw[name], MIN_ATTRIBUTE, MAX_ATTRIBUTE));

/** A v6 player: id, age, position and the twelve attributes. */
const isLegacyPlayer = (raw: unknown): raw is Rec & { id: string; age: number } =>
  isRecord(raw) &&
  isString(raw.id) &&
  isInt(raw.age) &&
  POSITIONS.includes(raw.position) &&
  hasAttributes(raw);

const withPotential = (raw: unknown, seed: number): unknown => {
  if (!isLegacyPlayer(raw)) return undefined;
  const overall = overallIn(raw.position as PlayerPosition, raw as unknown as PlayerAttributes);
  const rng = createRng(seed).fork("migrate-potential").fork(raw.id);
  return { ...raw, potential: potentialFor(raw.age, overall, rng) };
};

const withPotentials = (league: Rec, seed: number): unknown[] | undefined => {
  if (!Array.isArray(league.players)) return undefined;
  const players = league.players.map((p: unknown) => withPotential(p, seed));
  return players.includes(undefined) ? undefined : players;
};

type Legacy = Rec & { seed: number; league: Rec; season: Rec & { number: number } };

const isLegacyCareer = (raw: unknown): raw is Legacy =>
  isRecord(raw) &&
  isInt(raw.seed) &&
  isRecord(raw.league) &&
  isRecord(raw.season) &&
  isInt(raw.season.number);

const migrate = (raw: Legacy): unknown => {
  const players = withPotentials(raw.league, raw.seed);
  const league = players && parseLeague({ ...raw.league, players });
  if (!league) return raw;
  const { seed } = raw;
  const seasonNumber = raw.season.number;
  const contracts = initialContracts(league.players, seed, seasonNumber);
  return {
    ...raw,
    league,
    contracts,
    finances: initialFinances(league.clubs, league.players, contracts, seasonNumber),
    freeAgentIds: [],
    minutes: initialMinutes(league.players),
  };
};

/**
 * Schema v6 to v7 step for the `game` payload of a save: adds `potential` to every player and
 * `contracts`, `finances`, `freeAgentIds` and `minutes` to the career, all derived
 * deterministically from the career seed and the stored players (contracts of 1 to 5 seasons from
 * the current season, base income from the squad value, empty free agents, zero minutes).
 * Data that is not a usable v6 career is returned unchanged; `parseCareer` rejects it afterwards.
 * Never throws and never mutates its input.
 */
export const addCareerEconomy = (raw: unknown): unknown => {
  try {
    return isLegacyCareer(raw) ? migrate(raw) : raw;
  } catch {
    return raw;
  }
};
