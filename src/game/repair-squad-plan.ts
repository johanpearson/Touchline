import { autoPickLineup } from "./auto-pick-lineup";
import type { Career } from "./career";
import { clubSquad } from "./squad-plan";

/**
 * The user's squad plan after players left (or joined) the user's club in `career`: unchanged if
 * every starter and substitute is still in the squad (or, when `leaving` is given, if none of
 * those players was a starter or substitute), otherwise re-picked with `autoPickLineup` (same
 * formation and tactics). A squad too small to fill a lineup and a bench of seven keeps the old
 * plan, so a later step (youth intake, a signing) can repair it.
 */
export const repairedSquadPlan = (
  career: Career,
  leaving?: ReadonlySet<string>,
): Career["squadPlan"] => {
  const plan = career.squadPlan;
  const club = career.league.clubs.find((c) => c.id === career.userClubId);
  if (!club) return plan;
  const squad = clubSquad(club, career.league.players);
  const present = new Set(squad.map((p) => p.id));
  const planned = [...plan.starters, ...plan.bench];
  const affected = leaving
    ? planned.some((id) => leaving.has(id))
    : planned.some((id) => !present.has(id));
  if (!affected) return plan;
  try {
    const lineup = autoPickLineup(squad, plan.formation, career.condition);
    return { ...plan, starters: lineup.starters, bench: lineup.bench };
  } catch (error) {
    if (error instanceof RangeError) return plan;
    throw error;
  }
};
