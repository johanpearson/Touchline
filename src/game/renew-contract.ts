import type { Career } from "./career";
import type { Contract } from "./contract";
import { MAX_CONTRACT_SEASONS, MIN_CONTRACT_SEASONS } from "./initial-economy";
import { playerValue, wageFor } from "./player-value";
import { wageBill, wageBudget } from "./wage-budget";

export type RenewError =
  | "unknown-player"
  | "not-expiring"
  | "invalid-length"
  | "wage-too-low"
  | "over-wage-budget";

export type RenewResult = { ok: true; career: Career } | { ok: false; error: RenewError };

/** The wage a player asks to renew, in thousands: the share of his value he is worth right now. */
export const askingWage = (career: Career, playerId: string): number | undefined => {
  const player = career.league.players.find((p) => p.id === playerId);
  const contract = career.contracts[playerId];
  if (!player || !contract) return undefined;
  return wageFor(playerValue(player, contract, career.season.number));
};

const clubOf = (career: Career, playerId: string) =>
  career.league.clubs.find((c) => c.playerIds.includes(playerId));

const isValidLength = (seasons: number): boolean =>
  Number.isInteger(seasons) && seasons >= MIN_CONTRACT_SEASONS && seasons <= MAX_CONTRACT_SEASONS;

const isWithinBudget = (
  career: Career,
  clubId: string,
  current: Contract,
  wage: number,
): boolean => {
  const finance = career.finances[clubId];
  return (
    finance !== undefined && wageBill(career, clubId) - current.wage + wage <= wageBudget(finance)
  );
};

const isAcceptableWage = (wage: number, ask: number): boolean =>
  Number.isFinite(wage) && wage >= ask;

/** The club, contract and asking wage of a player, or undefined for an unknown player. */
const lookUp = (career: Career, playerId: string) => {
  const club = clubOf(career, playerId);
  if (!club) return undefined;
  const contract = career.contracts[playerId];
  if (!contract) return undefined;
  const ask = askingWage(career, playerId);
  if (ask === undefined) return undefined;
  return { club, contract, ask };
};

/** Refuses a length outside 1 to 5 seasons or a wage below the player's ask. */
const offerError = (ask: number, wage: number, seasons: number): RenewError | undefined => {
  if (!isValidLength(seasons)) return "invalid-length";
  if (!isAcceptableWage(wage, ask)) return "wage-too-low";
  return undefined;
};

/** The first reason the renewal is refused, or undefined when it is allowed. */
const renewError = (
  career: Career,
  playerId: string,
  wage: number,
  seasons: number,
): RenewError | undefined => {
  const found = lookUp(career, playerId);
  if (!found) return "unknown-player";
  if (found.contract.expiresSeason > career.season.number) return "not-expiring";
  const refused = offerError(found.ask, wage, seasons);
  if (refused) return refused;
  return isWithinBudget(career, found.club.id, found.contract, wage)
    ? undefined
    : "over-wage-budget";
};

/**
 * Renews the contract of a player whose contract ends with the current season, for `seasons`
 * (1 to 5) more seasons at `wage`. The player accepts any wage at or above his ask, and the club
 * must stay within its wage budget. The input career is not changed.
 */
export const renewContract = (
  career: Career,
  playerId: string,
  wage: number,
  seasons: number,
): RenewResult => {
  const error = renewError(career, playerId, wage, seasons);
  if (error) return { ok: false, error };
  const renewed = { wage, expiresSeason: career.season.number + seasons };
  return {
    ok: true,
    career: { ...career, contracts: { ...career.contracts, [playerId]: renewed } },
  };
};
