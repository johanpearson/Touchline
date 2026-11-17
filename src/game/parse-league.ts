import type { Club } from "./club";
import {
  hasUniqueValues,
  isInt,
  isIntInRange,
  isRecord,
  isString,
  isStringArray,
  parseList,
} from "./json-guards";
import type { League } from "./league";
import type { Player, PlayerAttributes } from "./player";
import { ATTRIBUTE_NAMES, MAX_ATTRIBUTE, MIN_ATTRIBUTE } from "./player";
import { overallIn } from "./player-overall";
import type { PlayerPosition } from "./squad-player";

const POSITIONS: readonly string[] = ["GK", "DEF", "MID", "FWD"];

const parseAttributes = (raw: Record<string, unknown>): PlayerAttributes | undefined => {
  const attributes: Record<string, number> = {};
  for (const name of ATTRIBUTE_NAMES) {
    const value = raw[name];
    if (!isIntInRange(value, MIN_ATTRIBUTE, MAX_ATTRIBUTE)) return undefined;
    attributes[name] = value;
  }
  return attributes as PlayerAttributes;
};

/** Parsing options: `legacy` accepts players saved before schema v7 and gives them their overall as potential. */
export type ParseLeagueOptions = { legacy?: boolean };

const parsePlayer = (raw: unknown, legacy: boolean): Player | undefined => {
  if (!isRecord(raw)) return undefined;
  const attributes = parseAttributes(raw);
  if (!attributes) return undefined;
  if (!isString(raw.id) || !isString(raw.name) || !isInt(raw.age) || raw.age < 1) return undefined;
  if (!isString(raw.position) || !POSITIONS.includes(raw.position)) return undefined;
  const position = raw.position as PlayerPosition;
  const potential =
    legacy && raw.potential === undefined
      ? Math.ceil(overallIn(position, attributes))
      : raw.potential;
  if (!isIntInRange(potential, MIN_ATTRIBUTE, MAX_ATTRIBUTE)) return undefined;
  if (potential < overallIn(position, attributes)) return undefined;
  return {
    ...attributes,
    potential,
    id: raw.id,
    name: raw.name,
    age: raw.age,
    position,
  };
};

const parseClub = (raw: unknown): Club | undefined => {
  if (!isRecord(raw) || !isRecord(raw.colours)) return undefined;
  const { id, name, shortName, colours, playerIds } = raw;
  if (!isString(id) || !isString(name) || !isString(shortName) || !isStringArray(playerIds)) {
    return undefined;
  }
  if (!isString(colours.primary) || !isString(colours.secondary)) return undefined;
  return {
    id,
    name,
    shortName,
    colours: { primary: colours.primary, secondary: colours.secondary },
    playerIds: [...playerIds],
  };
};

/** Validates a league and returns a fresh copy, or `undefined` when it is not usable. */
export const parseLeague = (raw: unknown, options: ParseLeagueOptions = {}): League | undefined => {
  if (!isRecord(raw) || !isString(raw.id) || !isString(raw.name)) return undefined;
  const clubs = parseList(raw.clubs, parseClub);
  const players = parseList(raw.players, (p) => parsePlayer(p, options.legacy === true));
  if (!clubs || !players || clubs.length < 2 || clubs.length % 2 !== 0) return undefined;
  if (!hasUniqueValues(clubs.map((c) => c.id)) || !hasUniqueValues(players.map((p) => p.id))) {
    return undefined;
  }
  const playerIds = new Set(players.map((p) => p.id));
  const squadIds = clubs.flatMap((c) => c.playerIds);
  if (!squadIds.every((id) => playerIds.has(id)) || !hasUniqueValues(squadIds)) return undefined;
  return { id: raw.id, name: raw.name, clubs, players };
};
