import type { Club } from "./club";
import { isNonNegativeInt, isRecord, isString } from "./json-guards";
import type { TransferOffer, TransferWindow } from "./transfer-offer";

/** The transfer window; an absent value (a v7 save from before the window existed) reads as closed. */
export const parseWindow = (raw: unknown): TransferWindow | undefined => {
  if (raw === undefined) return "closed";
  return raw === "open" || raw === "closed" ? raw : undefined;
};

const parseOffer = (
  raw: unknown,
  clubs: readonly Club[],
  userClubId: string,
): TransferOffer | undefined => {
  if (!isRecord(raw)) return undefined;
  const { id, fromClubId, playerId, fee } = raw;
  if (!isString(id) || !isString(fromClubId) || !isString(playerId) || !isNonNegativeInt(fee)) {
    return undefined;
  }
  const user = clubs.find((c) => c.id === userClubId);
  const buyerIsOther = fromClubId !== userClubId && clubs.some((c) => c.id === fromClubId);
  if (!buyerIsOther || !user?.playerIds.includes(playerId)) return undefined;
  return { id, fromClubId, playerId, fee };
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
