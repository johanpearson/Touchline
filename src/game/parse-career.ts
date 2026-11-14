import type { Career } from "./career";
import type { Club } from "./club";
import { isInt, isRecord, isString } from "./json-guards";
import { parseHistory } from "./parse-history";
import { parseLeague } from "./parse-league";
import { parseSeason } from "./parse-season";
import { parseCondition, parseSquadPlan } from "./parse-squad-plan";
import { clubSquad } from "./squad-plan";

export type CareerParseError =
  | "not-an-object"
  | "invalid-seed"
  | "invalid-league"
  | "unknown-user-club"
  | "invalid-season"
  | "inconsistent-results"
  | "invalid-history"
  | "invalid-squad-plan"
  | "invalid-condition";

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
  const userClub = league.clubs.find((c) => c.id === raw.userClubId);
  const squadPlan = parseSquadPlan(raw.squadPlan, clubSquad(userClub as Club, league.players));
  if (!squadPlan) return fail("invalid-squad-plan");
  const condition = parseCondition(raw.condition, league.players);
  if (!condition) return fail("invalid-condition");
  return {
    ok: true,
    career: {
      seed: raw.seed,
      userClubId: raw.userClubId,
      league,
      season: season.season,
      history,
      squadPlan,
      condition,
    },
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
