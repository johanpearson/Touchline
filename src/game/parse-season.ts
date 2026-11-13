import type { Season } from "./career";
import type { Result } from "./compute-table";
import type { Fixture } from "./generate-fixtures";
import {
  hasUniqueValues,
  isInt,
  isNonNegativeInt,
  isRecord,
  isString,
  parseList,
} from "./json-guards";

export type SeasonParseError = "invalid-season" | "inconsistent-results";

const parseFixture = (raw: unknown, clubIds: ReadonlySet<string>): Fixture | undefined => {
  if (!isRecord(raw) || !isString(raw.id) || !isInt(raw.matchday) || raw.matchday < 1) {
    return undefined;
  }
  const { homeClubId, awayClubId } = raw;
  if (!isString(homeClubId) || !isString(awayClubId) || homeClubId === awayClubId) return undefined;
  if (!clubIds.has(homeClubId) || !clubIds.has(awayClubId)) return undefined;
  return { id: raw.id, matchday: raw.matchday, homeClubId, awayClubId };
};

const parseResult = (raw: unknown): Result | undefined => {
  if (!isRecord(raw) || !isString(raw.fixtureId)) return undefined;
  const { homeClubId, awayClubId, homeGoals, awayGoals } = raw;
  if (!isString(homeClubId) || !isString(awayClubId)) return undefined;
  if (!isNonNegativeInt(homeGoals) || !isNonNegativeInt(awayGoals)) return undefined;
  return { fixtureId: raw.fixtureId, homeClubId, awayClubId, homeGoals, awayGoals };
};

const resultsMatchFixtures = (fixtures: Fixture[], results: Result[], current: number): boolean => {
  const played = fixtures.filter((f) => f.matchday < current);
  return (
    played.length === results.length &&
    played.every((f, i) => {
      const r = results[i] as Result;
      return r.fixtureId === f.id && r.homeClubId === f.homeClubId && r.awayClubId === f.awayClubId;
    })
  );
};

/** Validates a season against the club ids of its league and returns a fresh copy, or an error. */
export const parseSeason = (
  raw: unknown,
  clubIds: ReadonlySet<string>,
): { ok: true; season: Season } | { ok: false; error: SeasonParseError } => {
  const invalid = { ok: false, error: "invalid-season" } as const;
  if (!isRecord(raw) || !isInt(raw.number) || raw.number < 1) return invalid;
  const fixtures = parseList(raw.fixtures, (f) => parseFixture(f, clubIds));
  const results = parseList(raw.results, parseResult);
  if (!fixtures || !results || fixtures.length === 0) return invalid;
  if (!hasUniqueValues(fixtures.map((f) => f.id))) return invalid;
  const lastMatchday = Math.max(...fixtures.map((f) => f.matchday));
  const current = raw.currentMatchday;
  if (!isInt(current) || current < 1 || current > lastMatchday + 1) return invalid;
  if (!resultsMatchFixtures(fixtures, results, current)) {
    return { ok: false, error: "inconsistent-results" };
  }
  return { ok: true, season: { number: raw.number, fixtures, results, currentMatchday: current } };
};
