import type { AttributeChange } from "./develop-player";
import { isIntInRange, isRecord, isString, parseList } from "./json-guards";
import {
  ATTRIBUTE_NAMES,
  type AttributeName,
  MAX_ATTRIBUTE,
  MIN_ATTRIBUTE,
  type Player,
} from "./player";

const isAttributeName = (value: unknown): value is AttributeName =>
  ATTRIBUTE_NAMES.includes(value as AttributeName);

const isAttributeValue = (value: unknown): value is number =>
  isIntInRange(value, MIN_ATTRIBUTE, MAX_ATTRIBUTE);

const parseChange = (item: unknown, known: ReadonlySet<string>): AttributeChange | undefined => {
  if (!isRecord(item)) return undefined;
  const { playerId, attribute, before, after } = item;
  if (!isString(playerId) || !known.has(playerId)) return undefined;
  if (!isAttributeName(attribute)) return undefined;
  if (!isAttributeValue(before) || !isAttributeValue(after)) return undefined;
  return { playerId, attribute, before, after };
};

/** The change list of the last yearly development: known players, real attributes, values 1 to 20. */
export const parseDevelopment = (
  raw: unknown,
  players: readonly Player[],
): AttributeChange[] | undefined => {
  const known = new Set(players.map((p) => p.id));
  return parseList(raw, (item) => parseChange(item, known));
};
