import { autoPickLineup } from "./auto-pick-lineup";
import type { Career } from "./career";
import { clubSquad } from "./squad-plan";

/**
 * The user's squad plan after players left (or joined) the user's club: if a starter or substitute
 * is no longer in the squad, the lineup is re-picked with `autoPickLineup` (same formation and
 * tactics); otherwise the plan is returned unchanged. A squad too small to fill a lineup and a
 * bench of seven keeps the old plan, so a later step (youth intake, a signing) can repair it.
 */
export const repairSquadPlan = (career: Career): Career["squadPlan"] => {
  const plan = career.squadPlan;
  const club = career.league.clubs.find((c) => c.id === career.userClubId);
  if (!club) return plan;
  const squad = clubSquad(club, career.league.players);
  const ids = new Set(squad.map((p) => p.id));
  if ([...plan.starters, ...plan.bench].every((id) => ids.has(id))) return plan;
  try {
    const lineup = autoPickLineup(squad, plan.formation, career.condition);
    return { ...plan, starters: lineup.starters, bench: lineup.bench };
  } catch (error) {
    if (error instanceof RangeError) return plan;
    throw error;
  }
};
