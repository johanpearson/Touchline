import type { Career } from "./career";
import type { ClubFinance } from "./contract";

/** A club's wage bill may not exceed this share of its base income. */
export const WAGE_BUDGET_SHARE = 0.75;

/** The most a club may pay in wages per season, in thousands. */
export const wageBudget = (finance: Pick<ClubFinance, "baseIncome">): number =>
  Math.floor(finance.baseIncome * WAGE_BUDGET_SHARE);

/** The wages a club pays per season: the sum of the contracts of its players, in thousands. */
export const wageBill = (career: Career, clubId: string): number => {
  const club = career.league.clubs.find((c) => c.id === clubId);
  if (!club) return 0;
  return club.playerIds.reduce((sum, id) => sum + (career.contracts[id]?.wage ?? 0), 0);
};
