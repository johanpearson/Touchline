import type { Career } from "./career";
import { computeTable } from "./compute-table";
import { wageBill } from "./wage-budget";

/** Prize money for the champions, in thousands. */
export const PRIZE_FIRST_PLACE = 3000;
/** Prize money for the last place, in thousands. */
export const PRIZE_LAST_PLACE = 300;

/** The prize for a final position (1-based): falls linearly from first to last place. */
export const prizeFor = (position: number, clubCount: number): number => {
  if (clubCount <= 1) return PRIZE_FIRST_PLACE;
  const share = (clubCount - position) / (clubCount - 1);
  return Math.round(PRIZE_LAST_PLACE + (PRIZE_FIRST_PLACE - PRIZE_LAST_PLACE) * share);
};

/**
 * Pays out the finished season: every club's balance grows by its base income plus the prize for
 * its final position, and shrinks by its wage bill. Uses the current season's results, so call it
 * at the rollover before contracts expire. An unplayable table (invalid results) leaves the career as is.
 */
export const settleSeasonFinances = (career: Career): Career => {
  const clubs = career.league.clubs;
  const table = computeTable(
    clubs.map((c) => c.id),
    career.season.results,
  );
  if (!table.ok) return career;
  const finances = { ...career.finances };
  for (const row of table.table) {
    const finance = career.finances[row.clubId];
    if (!finance) continue;
    const prize = prizeFor(row.position, clubs.length);
    finances[row.clubId] = {
      ...finance,
      balance: finance.balance + finance.baseIncome + prize - wageBill(career, row.clubId),
    };
  }
  return { ...career, finances };
};
