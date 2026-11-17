import type { Career } from "./career";
import { pickBestEleven, SHAPE } from "./pick-best-eleven";
import { FULL_VALUE_CONTRACT_SEASONS, playerValue, wageFor } from "./player-value";
import { clubSquad } from "./squad-plan";

/** A player of a club's best eleven costs this many times his value. */
export const BEST_ELEVEN_PREMIUM = 1.3;

const clubOfPlayer = (career: Career, playerId: string) =>
  career.league.clubs.find((c) => c.playerIds.includes(playerId));

/**
 * A player's value in thousands: from his contract while he is at a club, from a fresh
 * three-season contract while he is a free agent. Undefined for players without a club or a
 * free-agent listing, and for club players without a contract.
 */
export const marketValue = (career: Career, playerId: string): number | undefined => {
  const player = career.league.players.find((p) => p.id === playerId);
  if (!player) return undefined;
  if (career.freeAgentIds.includes(playerId)) {
    const fresh = { expiresSeason: career.season.number + FULL_VALUE_CONTRACT_SEASONS - 1 };
    return playerValue(player, fresh, career.season.number);
  }
  const contract = career.contracts[playerId];
  if (!clubOfPlayer(career, playerId) || !contract) return undefined;
  return playerValue(player, contract, career.season.number);
};

/** The wage a player asks to sign, in thousands: a share of his value. */
export const signingWage = (career: Career, playerId: string): number | undefined => {
  const value = marketValue(career, playerId);
  return value === undefined ? undefined : wageFor(value);
};

const canFillBestEleven = (career: Career, clubId: string): boolean => {
  const club = career.league.clubs.find((c) => c.id === clubId);
  if (!club) return false;
  const squad = clubSquad(club, career.league.players);
  return (Object.keys(SHAPE) as (keyof typeof SHAPE)[]).every(
    (position) => squad.filter((p) => p.position === position).length >= SHAPE[position],
  );
};

const isInBestEleven = (career: Career, playerId: string): boolean => {
  const club = clubOfPlayer(career, playerId);
  if (!club || !canFillBestEleven(career, club.id)) return false;
  const eleven = pickBestEleven(clubSquad(club, career.league.players));
  return eleven.some((p) => p.id === playerId);
};

/**
 * The fee a club asks for a player, in whole thousands: his value, times 1.3 if he is in his
 * club's best eleven. A free agent costs no fee, his ask is his value. Undefined for an unknown player.
 */
export const askingPrice = (career: Career, playerId: string): number | undefined => {
  const value = marketValue(career, playerId);
  if (value === undefined) return undefined;
  return isInBestEleven(career, playerId) ? Math.ceil(value * BEST_ELEVEN_PREMIUM) : value;
};
