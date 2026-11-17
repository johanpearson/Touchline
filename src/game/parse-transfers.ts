import type { Club } from "./club";
import { isNonNegativeInt, isRecord, isString } from "./json-guards";
import type { TransferOffer, TransferWindow } from "./transfer-offer";

/** The transfer window; an absent value (a v7 save from before the window existed) reads as closed. */
export const parseWindow = (raw: unknown): TransferWindow | undefined => {
  if (raw === undefined) return "closed";
  return raw === "open" || raw === "closed" ? raw : undefined;
};

const hasOfferShape = (
  raw: unknown,
): raw is { id: string; fromClubId: string; playerId: string; fee: number } =>
  isRecord(raw) &&
  isString(raw.id) &&
  isString(raw.fromClubId) &&
  isString(raw.playerId) &&
  isNonNegativeInt(raw.fee);

const isOfferInLeague = (
  offer: TransferOffer,
  clubs: readonly Club[],
  userClubId: string,
): boolean => {
  const buyerIsOther =
    offer.fromClubId !== userClubId && clubs.some((c) => c.id === offer.fromClubId);
  const user = clubs.find((c) => c.id === userClubId);
  return buyerIsOther && (user?.playerIds.includes(offer.playerId) ?? false);
};

const parseOffer = (
  raw: unknown,
  clubs: readonly Club[],
  userClubId: string,
): TransferOffer | undefined => {
  if (!hasOfferShape(raw)) return undefined;
  const { id, fromClubId, playerId, fee } = raw;
  const offer = { id, fromClubId, playerId, fee };
  return isOfferInLeague(offer, clubs, userClubId) ? offer : undefined;
};

/** Offers for players of the user's club from other clubs, with unique ids; absent reads as none. */
export const parseOffers = (
  raw: unknown,
  clubs: readonly Club[],
  userClubId: string,
): TransferOffer[] | undefined => {
  if (raw === undefined) return [];
  if (!Array.isArray(raw)) return undefined;
  const offers = raw.map((o) => parseOffer(o, clubs, userClubId));
  const valid = offers.filter((o): o is TransferOffer => o !== undefined);
  const unique = new Set(valid.map((o) => o.id)).size === valid.length;
  return valid.length === raw.length && unique ? valid : undefined;
};
