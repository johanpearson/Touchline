import { createRng } from "../engine";
import { aiClubsById } from "./ai-clubs";
import { marketValue, signingWage } from "./asking-price";
import type { Career } from "./career";
import type { Club } from "./club";
import type { Player } from "./player";
import { playerOverall } from "./player-overall";
import { clubSquad } from "./squad-plan";
import { buyerError, reassign, staysWithinMinimums } from "./transfer-core";
import type { TransferOffer } from "./transfer-offer";

export const MAX_OFFERS = 5;
export const OFFER_MIN_FACTOR = 0.8;
export const OFFER_MAX_FACTOR = 1.2;

type Candidate = { offer: TransferOffer; priority: number };

/** The overall of the club's weakest regular starter in a position (4-4-2 slots); 0 if it has too few players. */
const weakestStarter = (squad: readonly Player[], position: Player["position"]): number => {
  const slots = { GK: 1, DEF: 4, MID: 4, FWD: 2 }[position];
  const best = squad
    .filter((p) => p.position === position)
    .map(playerOverall)
    .sort((a, b) => b - a)
    .slice(0, slots);
  return best.length < slots ? 0 : (best[slots - 1] as number);
};

/** A club needs a player when he would walk into its best eleven. */
const needsPlayer = (career: Career, club: Club, player: Player): boolean =>
  playerOverall(player) > weakestStarter(clubSquad(club, career.league.players), player.position);

const feeFor = (value: number, draw: number): number => {
  const raw = Math.round(value * (OFFER_MIN_FACTOR + draw * (OFFER_MAX_FACTOR - OFFER_MIN_FACTOR)));
  return Math.min(
    Math.floor(value * OFFER_MAX_FACTOR),
    Math.max(Math.ceil(value * OFFER_MIN_FACTOR), raw),
  );
};

const candidatesFor = (career: Career, player: Player, clubs: readonly Club[]): Candidate[] => {
  const value = marketValue(career, player.id);
  const wage = signingWage(career, player.id);
  if (value === undefined || wage === undefined) return [];
  const rng = createRng(career.seed).fork(`offers-${career.season.number}`).fork(player.id);
  return clubs.flatMap((club) => {
    const draw = rng.fork(club.id);
    const fee = feeFor(value, draw.fork("fee").next());
    const priority = draw.fork("priority").next();
    const affordable = buyerError(career, club.id, fee, wage) === undefined;
    if (!affordable || !needsPlayer(career, club, player)) return [];
    return [
      {
        priority,
        offer: {
          id: `offer-${career.season.number}-${club.id}-${player.id}`,
          fromClubId: club.id,
          playerId: player.id,
          fee,
        },
      },
    ];
  });
};

const isTaken = (offers: readonly TransferOffer[], offer: TransferOffer): boolean =>
  offers.some((o) => o.fromClubId === offer.fromClubId || o.playerId === offer.playerId);

/** Takes offers in order, skipping a club or player already used and any sale that would break the user's minimums. */
const pickOffers = (career: Career, ordered: readonly TransferOffer[]): TransferOffer[] => {
  const offers: TransferOffer[] = [];
  let remaining = career;
  for (const offer of ordered) {
    if (offers.length === MAX_OFFERS) break;
    if (isTaken(offers, offer)) continue;
    if (!staysWithinMinimums(remaining, career.userClubId, offer.playerId)) continue;
    offers.push(offer);
    remaining = reassign(remaining, offer.playerId);
  }
  return offers;
};

/**
 * Makes the offers AI clubs put in when the window opens: up to 5 in total, at most one per club
 * and one per player. A club offers for a player of the user's who would walk into its best eleven,
 * for 0.8 to 1.2 times his value, and only if it can pay the fee and wage and has room. No offer
 * is made for a player whose sale (together with the other offers) would take the user's squad
 * below the minimums. Randomness comes from `createRng(seed).fork("offers-<season>")`, so the
 * order of `league.clubs` does not matter. Offers are generated once: if `Career.offers` already
 * holds offers the career is returned unchanged.
 */
export const generateOffers = (career: Career): Career => {
  if (career.offers.length > 0) return career;
  const clubs = aiClubsById(career);
  const mine = clubSquad(
    career.league.clubs.find((c) => c.id === career.userClubId) ?? { playerIds: [] },
    career.league.players,
  );
  const candidates = mine
    .flatMap((player) => candidatesFor(career, player, clubs))
    .sort((a, b) => a.priority - b.priority || (a.offer.id < b.offer.id ? -1 : 1));
  return {
    ...career,
    offers: pickOffers(
      career,
      candidates.map((c) => c.offer),
    ),
  };
};
