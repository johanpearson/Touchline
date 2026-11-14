import { isRecord, isString } from "./json-guards";
import { parseLeague } from "./parse-league";
import { clubSquad, initialConditions, initialSquadPlan } from "./squad-plan";

/**
 * Schema v2 to v3 step for the `game` payload of a save: adds the 4-4-2 best-eleven plan with
 * neutral tactics and full condition, so a migrated career plays like before until the user
 * changes the plan. Data that is not a usable v2 career is returned unchanged; `parseCareer`
 * rejects it afterwards. Never throws and never mutates its input.
 */
export const addSquadPlanAndCondition = (raw: unknown): unknown => {
  try {
    if (!isRecord(raw) || !isString(raw.userClubId)) return raw;
    const league = parseLeague(raw.league);
    const club = league?.clubs.find((c) => c.id === raw.userClubId);
    if (!league || !club) return raw;
    return {
      ...raw,
      squadPlan: initialSquadPlan(clubSquad(club, league.players)),
      condition: initialConditions(league.players),
    };
  } catch {
    return raw;
  }
};
