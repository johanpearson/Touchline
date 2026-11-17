import type { Contract } from "./contract";
import type { Player } from "./player";
import { playerOverall } from "./player-overall";

/** Value in thousands at a skill of 10, an average age and a long contract. */
export const VALUE_AT_SKILL_10 = 1000;
/** Every this many skill points the value doubles. */
export const VALUE_DOUBLING_POINTS = 2;
/** Share of the gap between overall and potential that counts as skill already. */
export const POTENTIAL_SHARE = 0.5;
/** Up to this age age does not lower the value. */
export const AGE_DECLINE_START = 26;
/** From this age the value is at its floor, near zero. */
export const AGE_VALUE_ZERO = 35;
export const MIN_AGE_FACTOR = 0.02;
/** The value falls by this much for every season missing from a three-season contract. */
export const CONTRACT_SEASON_DISCOUNT = 0.15;
export const FULL_VALUE_CONTRACT_SEASONS = 3;
/** Share of the value a player asks as wage per season. */
export const WAGE_SHARE = 0.2;

const ageFactor = (age: number): number => {
  const share = (AGE_VALUE_ZERO - age) / (AGE_VALUE_ZERO - AGE_DECLINE_START);
  return Math.min(1, Math.max(MIN_AGE_FACTOR, share));
};

const contractFactor = (remainingSeasons: number): number => {
  const missing =
    FULL_VALUE_CONTRACT_SEASONS - Math.min(FULL_VALUE_CONTRACT_SEASONS, remainingSeasons);
  return 1 - CONTRACT_SEASON_DISCOUNT * missing;
};

/**
 * The value of a player in thousands: rises with overall and potential, falls with age (near zero
 * at 35) and with fewer remaining contract seasons. The asking price of a transfer.
 */
export const playerValue = (
  player: Player,
  contract: Pick<Contract, "expiresSeason">,
  seasonNumber: number,
): number => {
  const overall = playerOverall(player);
  const skill = overall + POTENTIAL_SHARE * (Math.max(player.potential, overall) - overall);
  const base = VALUE_AT_SKILL_10 * 2 ** ((skill - 10) / VALUE_DOUBLING_POINTS);
  const remaining = Math.max(0, contract.expiresSeason - seasonNumber + 1);
  return Math.round(base * ageFactor(player.age) * contractFactor(remaining));
};

/** The wage per season a player of this value asks, in thousands. */
export const wageFor = (value: number): number => Math.round(value * WAGE_SHARE);
