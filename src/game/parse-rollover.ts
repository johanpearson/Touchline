import {
  isInt,
  isIntInRange,
  isNonNegativeInt,
  isRecord,
  isString,
  parseList,
} from "./json-guards";
import type { RetiredPlayer, RolloverRecord } from "./rollover-record";
import type { PlayerPosition } from "./squad-player";

const POSITIONS: readonly string[] = ["GK", "DEF", "MID", "FWD"];

const parseRetired = (item: unknown): RetiredPlayer | undefined => {
  if (!isRecord(item)) return undefined;
  const { name, age, position } = item;
  if (!isString(name) || !isIntInRange(age, 15, 60)) return undefined;
  if (!isString(position) || !POSITIONS.includes(position)) return undefined;
  return { name, age, position: position as PlayerPosition };
};

/** The record of the last rollover: retired players with a position and an age, and whole-number money. */
export const parseRollover = (raw: unknown): RolloverRecord | undefined => {
  if (!isRecord(raw)) return undefined;
  const { retired, income, wages } = raw;
  if (!isInt(income) || !isNonNegativeInt(wages)) return undefined;
  const list = parseList(retired, parseRetired);
  return list ? { retired: list, income, wages } : undefined;
};
