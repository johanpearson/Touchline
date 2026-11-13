import type { TableRow } from "./compute-table";
import { isInt, isNonNegativeInt, isRecord, isString, parseList } from "./json-guards";
import type { SeasonSummary, TopScorer } from "./season-summary";

const ROW_NUMBERS = [
  "position",
  "played",
  "won",
  "drawn",
  "lost",
  "goalsFor",
  "goalsAgainst",
  "goalDifference",
  "points",
] as const;

const parseRow = (raw: unknown, clubIds: ReadonlySet<string>): TableRow | undefined => {
  if (!isRecord(raw) || !isString(raw.clubId) || !clubIds.has(raw.clubId)) return undefined;
  const numbers: Record<string, number> = {};
  for (const key of ROW_NUMBERS) {
    const value = raw[key];
    if (!isInt(value)) return undefined;
    if (key !== "goalDifference" && value < 0) return undefined;
    numbers[key] = value;
  }
  return { clubId: raw.clubId, ...numbers } as TableRow;
};

const parseScorer = (raw: unknown, clubIds: ReadonlySet<string>): TopScorer | undefined => {
  if (!isRecord(raw) || !isString(raw.name) || !isString(raw.clubId)) return undefined;
  if (!clubIds.has(raw.clubId) || !isNonNegativeInt(raw.goals)) return undefined;
  return { name: raw.name, clubId: raw.clubId, goals: raw.goals };
};

const parseSummary = (raw: unknown, clubIds: ReadonlySet<string>): SeasonSummary | undefined => {
  if (!isRecord(raw) || !isInt(raw.seasonNumber) || raw.seasonNumber < 1) return undefined;
  if (!isString(raw.championId) || !clubIds.has(raw.championId)) return undefined;
  if (!isInt(raw.userPosition) || raw.userPosition < 1) return undefined;
  const finalTable = parseList(raw.finalTable, (row) => parseRow(row, clubIds));
  const userRecord = parseRow(raw.userRecord, clubIds);
  const topScorers = parseList(raw.topScorers, (s) => parseScorer(s, clubIds));
  if (!finalTable || !userRecord || !topScorers) return undefined;
  return {
    seasonNumber: raw.seasonNumber,
    championId: raw.championId,
    finalTable,
    userPosition: raw.userPosition,
    userRecord,
    topScorers,
  };
};

/** Validates the season history and returns a fresh copy, or `undefined` when it is not usable. */
export const parseHistory = (
  raw: unknown,
  clubIds: ReadonlySet<string>,
): SeasonSummary[] | undefined => parseList(raw, (item) => parseSummary(item, clubIds));
