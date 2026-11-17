import { createRng } from "../engine";
import type { Career } from "./career";
import { repairedSquadPlan } from "./repair-squad-plan";

/** Players younger than this never retire. */
export const RETIREMENT_START_AGE = 34;
/** Chance of retiring at `RETIREMENT_START_AGE`. */
export const RETIREMENT_START_CHANCE = 0.15;
/** Points of chance added for every year of age above the start age. */
export const RETIREMENT_CHANCE_STEP = 0.15;
/** From this age a player always retires. */
export const RETIREMENT_CERTAIN_AGE = 38;

/** The chance (0 to 1) that a player of this age retires at the rollover. */
export const retirementChance = (age: number): number => {
  if (age < RETIREMENT_START_AGE) return 0;
  if (age >= RETIREMENT_CERTAIN_AGE) return 1;
  return Math.min(
    1,
    RETIREMENT_START_CHANCE + (age - RETIREMENT_START_AGE) * RETIREMENT_CHANCE_STEP,
  );
};

const without = <T>(record: Readonly<Record<string, T>>, ids: ReadonlySet<string>) =>
  Object.fromEntries(Object.entries(record).filter(([id]) => !ids.has(id)));

/**
 * Retires players by age at the rollover (call it after the finished season's summary is stored in
 * `history`, and after ageing). Every player of the league, clubs and free agents alike, draws from
 * his own stream of `createRng(seed).fork("retirement-<season>")`, so the order of players does not
 * matter. Retirees disappear from their club, `freeAgentIds`, `league.players`, contracts,
 * condition and minutes. Old results keep their scorer ids (`parseCareer` allows ids of players who
 * left the league) and the summary already stored keeps the scorer names. If a starter or
 * substitute of the user's squad plan retires, the plan is repaired with `autoPickLineup`.
 */
export const retirePlayers = (career: Career): Career => {
  const season = createRng(career.seed).fork(`retirement-${career.season.number}`);
  const retiring = new Set(
    career.league.players
      .filter((p) => season.fork(p.id).chance(retirementChance(p.age)))
      .map((p) => p.id),
  );
  if (retiring.size === 0) return career;
  const next: Career = {
    ...career,
    league: {
      ...career.league,
      clubs: career.league.clubs.map((club) => ({
        ...club,
        playerIds: club.playerIds.filter((id) => !retiring.has(id)),
      })),
      players: career.league.players.filter((p) => !retiring.has(p.id)),
    },
    freeAgentIds: career.freeAgentIds.filter((id) => !retiring.has(id)),
    contracts: without(career.contracts, retiring),
    condition: without(career.condition, retiring),
    minutes: without(career.minutes, retiring),
  };
  return { ...next, squadPlan: repairedSquadPlan(next) };
};
