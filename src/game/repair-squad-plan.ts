import { autoPickLineup } from "./auto-pick-lineup";
import type { Career } from "./career";
import { clubSquad } from "./squad-plan";

/**
 * The user's squad plan after the players in `leaving` have left the club in `career`: unchanged
 * if none of them was a starter or substitute, otherwise re-picked with `autoPickLineup` (same
 * formation and tactics).
 */
export const repairedSquadPlan = (
  career: Career,
  leaving: ReadonlySet<string>,
): Career["squadPlan"] => {
  const plan = career.squadPlan;
  if (![...plan.starters, ...plan.bench].some((id) => leaving.has(id))) return plan;
  const club = career.league.clubs.find((c) => c.id === career.userClubId);
  if (!club) return plan;
  const squad = clubSquad(club, career.league.players);
  const lineup = autoPickLineup(squad, plan.formation, career.condition);
  return { ...plan, starters: lineup.starters, bench: lineup.bench };
};
