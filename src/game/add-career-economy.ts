import { createRng } from "../engine";
import { initialContracts, initialFinances, initialMinutes } from "./initial-economy";
import { isInt, isIntInRange, isRecord, isString } from "./json-guards";
import { parseLeague } from "./parse-league";
import { ATTRIBUTE_NAMES, MAX_ATTRIBUTE, MIN_ATTRIBUTE, type PlayerAttributes } from "./player";
import { overallIn } from "./player-overall";
import { potentialFor } from "./potential";
import type { PlayerPosition } from "./squad-player";

const POSITIONS: readonly unknown[] = ["GK", "DEF", "MID", "FWD"];

const withPotential = (raw: unknown, seed: number): unknown => {
  if (!isRecord(raw) || !isString(raw.id) || !isInt(raw.age)) return undefined;
  if (!POSITIONS.includes(raw.position)) return undefined;
  if (!ATTRIBUTE_NAMES.every((n) => isIntInRange(raw[n], MIN_ATTRIBUTE, MAX_ATTRIBUTE))) {
    return undefined;
  }
  const overall = overallIn(raw.position as PlayerPosition, raw as unknown as PlayerAttributes);
  const rng = createRng(seed).fork("migrate-potential").fork(raw.id);
  return { ...raw, potential: potentialFor(raw.age, overall, rng) };
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
    if (!isRecord(raw) || !isInt(raw.seed) || !isRecord(raw.league)) return raw;
    if (!isRecord(raw.season) || !isInt(raw.season.number)) return raw;
    const { seed } = raw;
    if (!Array.isArray(raw.league.players)) return raw;
    const players = raw.league.players.map((p: unknown) => withPotential(p, seed));
    if (players.includes(undefined)) return raw;
    const league = parseLeague({ ...raw.league, players });
    if (!league) return raw;
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
  } catch {
    return raw;
  }
};
