import { askingPrice, signingWage } from "./asking-price";
import type { Career } from "./career";
import {
  buyerError,
  DEFAULT_CONTRACT_SEASONS,
  isValidSeasons,
  payFee,
  reassign,
  staysWithinMinimums,
  withContract,
} from "./transfer-core";
import { refuse, type TransferError, type TransferResult } from "./transfer-result";
import { isWindowOpen } from "./transfer-window";

const sellerOf = (career: Career, playerId: string) =>
  career.league.clubs.find((c) => c.playerIds.includes(playerId));

type Listing = { sellerId: string; ask: number; wage: number };

const listingOf = (career: Career, playerId: string): Listing | undefined => {
  const seller = sellerOf(career, playerId);
  if (!seller) return undefined;
  const ask = askingPrice(career, playerId);
  if (ask === undefined) return undefined;
  const wage = signingWage(career, playerId);
  if (wage === undefined) return undefined;
  return { sellerId: seller.id, ask, wage };
};

const priceError = (listing: Listing, fee: number, seasons: number): TransferError | undefined => {
  if (!isValidSeasons(seasons)) return "invalid-length";
  if (!Number.isInteger(fee)) return "invalid-fee";
  return fee < listing.ask ? "fee-too-low" : undefined;
};

const buyError = (
  career: Career,
  playerId: string,
  fee: number,
  seasons: number,
): TransferError | undefined => {
  if (!isWindowOpen(career)) return "window-closed";
  const listing = listingOf(career, playerId);
  if (!listing) return "unknown-player";
  if (listing.sellerId === career.userClubId) return "own-player";
  const refusedPrice = priceError(listing, fee, seasons);
  if (refusedPrice) return refusedPrice;
  const refused = buyerError(career, career.userClubId, fee, listing.wage);
  if (refused) return refused;
  return staysWithinMinimums(career, listing.sellerId, playerId)
    ? undefined
    : "seller-below-minimum";
};

/**
 * Buys a player from an AI club for `fee` (thousands) during the off-season window. The AI accepts
 * at once if the fee is at least the asking price and its squad stays within the minimums. The
 * user pays the fee, the seller receives it, and the player gets a contract of `seasons` (1 to 5,
 * default 3) at the wage he asks. The squad plan is left alone. The input career is not changed.
 */
export const buyPlayer = (
  career: Career,
  playerId: string,
  fee: number,
  seasons: number = DEFAULT_CONTRACT_SEASONS,
): TransferResult => {
  const error = buyError(career, playerId, fee, seasons);
  if (error) return refuse(error);
  const seller = sellerOf(career, playerId);
  const wage = signingWage(career, playerId) as number;
  const moved = reassign(career, playerId, career.userClubId);
  const paid = payFee(moved, career.userClubId, seller?.id, fee);
  return { ok: true, career: withContract(paid, playerId, wage, seasons) };
};
