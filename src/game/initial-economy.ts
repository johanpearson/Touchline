import { createRng } from "../engine";
import type { Club } from "./club";
import type { ClubFinance, Contract } from "./contract";
import type { Player } from "./player";
import { playerValue, wageFor } from "./player-value";

export const MIN_CONTRACT_SEASONS = 1;
export const MAX_CONTRACT_SEASONS = 5;
/** Base income per season as a share of the club's initial squad value. */
export const INCOME_SHARE_OF_SQUAD_VALUE = 0.35;

/**
 * A contract of 1 to 5 seasons, counted from `seasonNumber`, for every player. The wage is the
 * one a player of that value asks. Deterministic for a seed.
 */
export const initialContracts = (
  players: readonly Player[],
  seed: number,
  seasonNumber: number,
): Record<string, Contract> => {
  const rng = createRng(seed).fork("contracts");
  return Object.fromEntries(
    players.map((player) => {
      const length = rng.fork(player.id).int(MIN_CONTRACT_SEASONS, MAX_CONTRACT_SEASONS);
      const expiresSeason = seasonNumber + length - 1;
      const wage = wageFor(playerValue(player, { expiresSeason }, seasonNumber));
      return [player.id, { wage, expiresSeason }];
    }),
  );
};

/** Balance 0 and a base income in proportion to the club's squad value, so strong clubs are richer. */
export const initialFinances = (
  clubs: readonly Club[],
  players: readonly Player[],
  contracts: Readonly<Record<string, Contract>>,
  seasonNumber: number,
): Record<string, ClubFinance> => {
  const byId = new Map(players.map((p) => [p.id, p]));
  return Object.fromEntries(
    clubs.map((club) => {
      const squadValue = club.playerIds.reduce((sum, id) => {
        const player = byId.get(id);
        const contract = contracts[id];
        return player && contract ? sum + playerValue(player, contract, seasonNumber) : sum;
      }, 0);
      return [
        club.id,
        { balance: 0, baseIncome: Math.round(squadValue * INCOME_SHARE_OF_SQUAD_VALUE) },
      ];
    }),
  );
};

/** Zero season minutes for every player. */
export const initialMinutes = (players: readonly Player[]): Record<string, number> =>
  Object.fromEntries(players.map((p) => [p.id, 0]));
