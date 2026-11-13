import type { Career } from "./career";
import { isInt, isRecord, isString } from "./json-guards";
import { parseHistory } from "./parse-history";
import { parseLeague } from "./parse-league";
import { parseSeason } from "./parse-season";

export type CareerParseError =
  | "not-an-object"
  | "invalid-seed"
  | "invalid-league"
  | "unknown-user-club"
  | "invalid-season"
  | "inconsistent-results"
  | "invalid-history";

export type CareerParseResult =
  | { ok: true; career: Career }
  | { ok: false; error: CareerParseError };

const fail = (error: CareerParseError): CareerParseResult => ({ ok: false, error });

const parseUnchecked = (raw: unknown): CareerParseResult => {
  if (!isRecord(raw)) return fail("not-an-object");
  if (!isInt(raw.seed)) return fail("invalid-seed");
  const league = parseLeague(raw.league);
  if (!league) return fail("invalid-league");
  const clubIds = new Set(league.clubs.map((c) => c.id));
  if (!isString(raw.userClubId) || !clubIds.has(raw.userClubId)) return fail("unknown-user-club");
  const season = parseSeason(raw.season, clubIds);
  if (!season.ok) return fail(season.error);
  const history = parseHistory(raw.history, clubIds);
  if (!history) return fail("invalid-history");
  return {
    ok: true,
    career: { seed: raw.seed, userClubId: raw.userClubId, league, season: season.season, history },
  };
};

/**
 * Checks that untrusted data (a save or an imported file) is a usable `Career`.
 * Never throws and never returns the input: the career is rebuilt field by field.
 */
export const parseCareer = (raw: unknown): CareerParseResult => {
  try {
    return parseUnchecked(raw);
  } catch {
    return fail("not-an-object");
  }
};
