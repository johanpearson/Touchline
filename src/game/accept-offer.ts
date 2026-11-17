import { signingWage } from "./asking-price";
import type { Career } from "./career";
import { withdrawFromUser } from "./release-player";
import {
  buyerError,
  DEFAULT_CONTRACT_SEASONS,
  payFee,
  reassign,
  staysWithinMinimums,
  withContract,
} from "./transfer-core";
import type { TransferOffer } from "./transfer-offer";
import { refuse, type TransferError, type TransferResult } from "./transfer-result";
import { isWindowOpen } from "./transfer-window";

const offerError = (
  career: Career,
  offer: TransferOffer,
  wage: number,
): TransferError | undefined => {
  if (!isWindowOpen(career)) return "window-closed";
  const user = career.league.clubs.find((c) => c.id === career.userClubId);
  const buyerKnown = career.league.clubs.some((c) => c.id === offer.fromClubId);
  if (!user?.playerIds.includes(offer.playerId) || !buyerKnown) return "unknown-player";
  const refused = buyerError(career, offer.fromClubId, offer.fee, wage);
  if (refused) return refused;
  return staysWithinMinimums(career, career.userClubId, offer.playerId)
    ? undefined
    : "seller-below-minimum";
};

/**
 * Sells a player to the AI club that made `offer` (it must be in `Career.offers`, and the window
 * must be open). The club pays the fee to the user, the player gets a contract at his asking wage,
 * the user's squad plan is repaired if he was in it, and offers for him are dropped. Refused if
 * the buyer cannot pay or has no room, or the user's squad would fall below the minimums.
 * The input career is not changed.
 */
export const acceptOffer = (career: Career, offer: TransferOffer): TransferResult => {
  const stored = career.offers.find((o) => o.id === offer.id);
  if (!stored) return refuse("unknown-offer");
  const wage = signingWage(career, stored.playerId) ?? 0;
  const error = offerError(career, stored, wage);
  if (error) return refuse(error);
  const sold = withdrawFromUser(career, stored.playerId);
  const moved = reassign(sold, stored.playerId, stored.fromClubId);
  const paid = payFee(moved, stored.fromClubId, career.userClubId, stored.fee);
  const signed = withContract(paid, stored.playerId, wage, DEFAULT_CONTRACT_SEASONS);
  const offers = career.offers.filter((o) => o.playerId !== stored.playerId);
  return { ok: true, career: { ...signed, offers } };
};
