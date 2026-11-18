import type { Career } from "./career";
import type { RolloverRecord } from "./rollover-record";
import { wageBill } from "./wage-budget";

/**
 * Describes the rollover for the user's club. `stored` is the career before finances, ageing and
 * retirement, `settled` after the finances were paid, `retired` the career after retirement.
 */
export const buildRolloverRecord = (
  stored: Career,
  settled: Career,
  retired: Career,
): RolloverRecord => {
  const userId = stored.userClubId;
  const wages = wageBill(stored, userId);
  const staying = new Set(retired.league.players.map((p) => p.id));
  const club = stored.league.clubs.find((c) => c.id === userId);
  const gone = stored.league.players.filter(
    (p) => club?.playerIds.includes(p.id) && !staying.has(p.id),
  );
  return {
    retired: gone.map((p) => ({ name: p.name, age: p.age + 1, position: p.position })),
    income:
      (settled.finances[userId]?.balance ?? 0) - (stored.finances[userId]?.balance ?? 0) + wages,
    wages,
  };
};
