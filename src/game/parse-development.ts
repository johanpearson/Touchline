import type { AttributeChange } from "./develop-player";
import { isIntInRange, isRecord, isString, parseList } from "./json-guards";
import { ATTRIBUTE_NAMES, type AttributeName, MAX_ATTRIBUTE, MIN_ATTRIBUTE } from "./player";
import type { Player } from "./player";

const isAttributeName = (value: unknown): value is AttributeName =>
  ATTRIBUTE_NAMES.includes(value as AttributeName);

/** The change list of the last yearly development: known players, real attributes, values 1 to 20. */
export const parseDevelopment = (
  raw: unknown,
  players: readonly Player[],
): AttributeChange[] | undefined => {
  const known = new Set(players.map((p) => p.id));
  return parseList(raw, (item) => {
    if (!isRecord(item)) return undefined;
    const { playerId, attribute, before, after } = item;
    if (!isString(playerId) || !known.has(playerId) || !isAttributeName(attribute)) return undefined;
    if (!isIntInRange(before, MIN_ATTRIBUTE, MAX_ATTRIBUTE)) return undefined;
    if (!isIntInRange(after, MIN_ATTRIBUTE, MAX_ATTRIBUTE)) return undefined;
    return { playerId, attribute, before, after };
  });
};
