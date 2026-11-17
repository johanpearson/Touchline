import type { Career } from "./career";
import { repairSquadPlan } from "./repair-squad-plan";

/**
 * Lets every player whose contract ends with the finished season (`expiresSeason` up to the
 * current season) leave his club for the free agents. His `Player` record and contract stay; only
 * the club's `playerIds` and `freeAgentIds` change. If a starter or substitute of the user's
 * squad plan left, the plan is repaired with `autoPickLineup` (same formation and tactics).
 * Contracts that run longer are never touched.
 */
export const expireContracts = (career: Career): Career => {
  const isExpiring = (id: string): boolean =>
    (career.contracts[id]?.expiresSeason ?? Number.POSITIVE_INFINITY) <= career.season.number;
  const leaving = career.league.clubs.flatMap((c) => c.playerIds.filter(isExpiring));
  if (leaving.length === 0) return career;

  const clubs = career.league.clubs.map((club) => ({
    ...club,
    playerIds: club.playerIds.filter((id) => !isExpiring(id)),
  }));
  const next: Career = {
    ...career,
    league: { ...career.league, clubs },
    freeAgentIds: [...career.freeAgentIds, ...leaving],
  };
  return { ...next, squadPlan: repairSquadPlan(next) };
};
