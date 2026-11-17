import type { Career } from "./career";
import type { Club } from "./club";
import { isInt, isRecord, isString } from "./json-guards";
import { parseDevelopment } from "./parse-development";
import { parseContracts, parseFinances, parseFreeAgentIds, parseMinutes } from "./parse-economy";
import { parseHistory } from "./parse-history";
import { parseLeague } from "./parse-league";
import { parseSeason } from "./parse-season";
import { parseCondition, parseSquadPlan } from "./parse-squad-plan";
import { parseOffers, parseWindow } from "./parse-transfers";
import { scorersBelongToClubs } from "./scorers-belong-to-clubs";
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
  | "invalid-condition"
  | "invalid-engine-version"
  | "invalid-contracts"
  | "invalid-finances"
  | "invalid-free-agents"
  | "invalid-minutes"
  | "invalid-window"
  | "invalid-offers"
  | "invalid-development";

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
  if (!scorersBelongToClubs(season.season.results, league.clubs, league.players))
    return fail("invalid-season");
  const history = parseHistory(raw.history, clubIds);
  if (!history) return fail("invalid-history");
  const userClub = league.clubs.find((c) => c.id === raw.userClubId);
  const squadPlan = parseSquadPlan(raw.squadPlan, clubSquad(userClub as Club, league.players));
  if (!squadPlan) return fail("invalid-squad-plan");
  const condition = parseCondition(raw.condition, league.players);
  if (!condition) return fail("invalid-condition");
  if (raw.engineVersion !== 2) return fail("invalid-engine-version");
  const contracts = parseContracts(raw.contracts, league.players, league.clubs);
  if (!contracts) return fail("invalid-contracts");
  const finances = parseFinances(raw.finances, league.clubs);
  if (!finances) return fail("invalid-finances");
  const freeAgentIds = parseFreeAgentIds(raw.freeAgentIds, league.players, league.clubs);
  if (!freeAgentIds) return fail("invalid-free-agents");
  const minutes = parseMinutes(raw.minutes, league.players);
  if (!minutes) return fail("invalid-minutes");
  const window = parseWindow(raw.window);
  if (!window) return fail("invalid-window");
  const offers = parseOffers(raw.offers, league.clubs, raw.userClubId);
  if (!offers) return fail("invalid-offers");
  const lastDevelopment =
    raw.lastDevelopment === undefined
      ? undefined
      : parseDevelopment(raw.lastDevelopment, league.players);
  if (raw.lastDevelopment !== undefined && !lastDevelopment) return fail("invalid-development");
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
      engineVersion: 2,
      contracts,
      finances,
      freeAgentIds,
      minutes,
      window,
      offers,
      ...(lastDevelopment ? { lastDevelopment } : {}),
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
