import type { Career } from "./career";
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
  const club = clubOf(career, playerId);
  const contract = career.contracts[playerId];
  const ask = askingWage(career, playerId);
  if (!club || !contract || ask === undefined) return { ok: false, error: "unknown-player" };
  if (contract.expiresSeason > career.season.number) return { ok: false, error: "not-expiring" };
  if (
    !Number.isInteger(seasons) ||
    seasons < MIN_CONTRACT_SEASONS ||
    seasons > MAX_CONTRACT_SEASONS
  )
    return { ok: false, error: "invalid-length" };
  if (!Number.isFinite(wage) || wage < ask) return { ok: false, error: "wage-too-low" };
  const finance = career.finances[club.id];
  if (!finance || wageBill(career, club.id) - contract.wage + wage > wageBudget(finance))
    return { ok: false, error: "over-wage-budget" };
  const renewed = { wage, expiresSeason: career.season.number + seasons };
  return {
    ok: true,
    career: { ...career, contracts: { ...career.contracts, [playerId]: renewed } },
  };
};
