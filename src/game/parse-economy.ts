import type { Club } from "./club";
import type { ClubFinance, Contract } from "./contract";
import { hasUniqueValues, isInt, isNonNegativeInt, isRecord, isStringArray } from "./json-guards";
import type { Player } from "./player";

const parseContract = (raw: unknown): Contract | undefined => {
  if (!isRecord(raw)) return undefined;
  const { wage, expiresSeason } = raw;
  if (!isNonNegativeInt(wage) || !isInt(expiresSeason) || expiresSeason < 1) return undefined;
  return { wage, expiresSeason };
};

/** Contracts by player id: known players only, and every club player has one. */
export const parseContracts = (
  raw: unknown,
  players: readonly Player[],
  clubs: readonly Club[],
): Record<string, Contract> | undefined => {
  if (!isRecord(raw)) return undefined;
  const known = new Set(players.map((p) => p.id));
  const contracts: Record<string, Contract> = {};
  for (const [id, value] of Object.entries(raw)) {
    const contract = parseContract(value);
    if (!known.has(id) || !contract) return undefined;
    contracts[id] = contract;
  }
  const covered = clubs.every((club) => club.playerIds.every((id) => id in contracts));
  return covered ? contracts : undefined;
};

const parseFinance = (raw: unknown): ClubFinance | undefined => {
  if (!isRecord(raw)) return undefined;
  const { balance, baseIncome } = raw;
  if (!isInt(balance) || !isNonNegativeInt(baseIncome)) return undefined;
  return { balance, baseIncome };
};

/** Finances by club id: exactly the clubs of the league. */
export const parseFinances = (
  raw: unknown,
  clubs: readonly Club[],
): Record<string, ClubFinance> | undefined => {
  if (!isRecord(raw)) return undefined;
  const known = new Set(clubs.map((c) => c.id));
  const entries = Object.entries(raw);
  if (entries.length !== known.size) return undefined;
  const finances: Record<string, ClubFinance> = {};
  for (const [id, value] of entries) {
    const finance = parseFinance(value);
    if (!known.has(id) || !finance) return undefined;
    finances[id] = finance;
  }
  return finances;
};

/** Free agents: known players, no duplicates, none of them in a club. */
export const parseFreeAgentIds = (
  raw: unknown,
  players: readonly Player[],
  clubs: readonly Club[],
): string[] | undefined => {
  if (!isStringArray(raw) || !hasUniqueValues(raw)) return undefined;
  const known = new Set(players.map((p) => p.id));
  const inClub = new Set(clubs.flatMap((c) => c.playerIds));
  return raw.every((id) => known.has(id) && !inClub.has(id)) ? [...raw] : undefined;
};

/** Season minutes by player id: known players, never negative. */
export const parseMinutes = (
  raw: unknown,
  players: readonly Player[],
): Record<string, number> | undefined => {
  if (!isRecord(raw)) return undefined;
  const known = new Set(players.map((p) => p.id));
  const minutes: Record<string, number> = {};
  for (const [id, value] of Object.entries(raw)) {
    if (!known.has(id) || typeof value !== "number" || !Number.isFinite(value) || value < 0) {
      return undefined;
    }
    minutes[id] = value;
  }
  return minutes;
};
