import type { Career } from "./career";
import type { Contract } from "./contract";
import { MAX_SQUAD_SIZE, squadLimits } from "./squad-limits";
import type { TransferError } from "./transfer-result";
import { wageBill, wageBudget } from "./wage-budget";

/** The default contract length for a signing or an accepted offer, in seasons. */
export const DEFAULT_CONTRACT_SEASONS = 3;

/** The first reason a club cannot pay `fee` and `wage` for one more player, or undefined. */
export const buyerError = (
  career: Career,
  clubId: string,
  fee: number,
  wage: number,
): TransferError | undefined => {
  const finance = career.finances[clubId];
  if (!finance || finance.balance < fee) return "insufficient-funds";
  if (wageBill(career, clubId) + wage > wageBudget(finance)) return "over-wage-budget";
  if (squadLimits(career, clubId).count >= MAX_SQUAD_SIZE) return "squad-full";
  return undefined;
};

/** Moves a player to a club, or to the free agents when `toClubId` is omitted. Nothing else changes. */
export const reassign = (career: Career, playerId: string, toClubId?: string): Career => {
  const clubs = career.league.clubs.map((club) => {
    const kept = club.playerIds.filter((id) => id !== playerId);
    return { ...club, playerIds: club.id === toClubId ? [...kept, playerId] : kept };
  });
  const others = career.freeAgentIds.filter((id) => id !== playerId);
  return {
    ...career,
    league: { ...career.league, clubs },
    freeAgentIds: toClubId === undefined ? [...others, playerId] : others,
  };
};

/** True if the club's squad is still within the minimums once `playerId` has left it. */
export const staysWithinMinimums = (career: Career, clubId: string, playerId: string): boolean => {
  const left = reassign(career, playerId);
  const limits = squadLimits(left, clubId);
  return limits.missingTotal === 0 && Object.keys(limits.missing).length === 0;
};

export const isValidSeasons = (seasons: number): boolean =>
  Number.isInteger(seasons) && seasons >= 1 && seasons <= 5;

/** Moves `fee` from the buyer to the seller; without a seller (a free agent) only the buyer pays. */
export const payFee = (
  career: Career,
  buyerId: string,
  sellerId: string | undefined,
  fee: number,
) => {
  const finances = { ...career.finances };
  for (const [clubId, delta] of [
    [buyerId, -fee],
    [sellerId, fee],
  ] as const) {
    const finance = clubId === undefined ? undefined : finances[clubId];
    if (clubId !== undefined && finance) {
      finances[clubId] = { ...finance, balance: finance.balance + delta };
    }
  }
  return { ...career, finances };
};

export const withContract = (
  career: Career,
  playerId: string,
  wage: number,
  seasons: number,
): Career => {
  const contract: Contract = { wage, expiresSeason: career.season.number + seasons };
  return { ...career, contracts: { ...career.contracts, [playerId]: contract } };
};
