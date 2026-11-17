import type { Career } from "./career";
import { repairedSquadPlan } from "./repair-squad-plan";
import { reassign, staysWithinMinimums } from "./transfer-core";
import { refuse, type TransferResult } from "./transfer-result";

/** Removes a player from the user's club and repairs the squad plan (same formation and tactics). */
export const withdrawFromUser = (career: Career, playerId: string): Career => {
  const left = reassign(career, playerId);
  return { ...left, squadPlan: repairedSquadPlan(left, new Set([playerId])) };
};

const isUsers = (career: Career, playerId: string): boolean =>
  career.league.clubs.find((c) => c.id === career.userClubId)?.playerIds.includes(playerId) ??
  false;

/**
 * Releases one of the user's players to the free agents: no fee, and his wage is no longer paid
 * because he leaves the club. Refused if the squad would fall below the minimums. The squad plan is
 * repaired if he was in it. The input career is not changed.
 */
export const releasePlayer = (career: Career, playerId: string): TransferResult => {
  if (!isUsers(career, playerId)) return refuse("unknown-player");
  if (!staysWithinMinimums(career, career.userClubId, playerId)) {
    return refuse("seller-below-minimum");
  }
  return { ok: true, career: withdrawFromUser(career, playerId) };
};
