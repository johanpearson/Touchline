import { signingWage } from "./asking-price";
import type { Career } from "./career";
import {
  buyerError,
  DEFAULT_CONTRACT_SEASONS,
  isValidSeasons,
  reassign,
  withContract,
} from "./transfer-core";
import { refuse, type TransferError, type TransferResult } from "./transfer-result";

const signError = (
  career: Career,
  playerId: string,
  wage: number,
  seasons: number,
): TransferError | undefined => {
  const ask = signingWage(career, playerId);
  if (ask === undefined || !career.freeAgentIds.includes(playerId)) return "unknown-player";
  if (!isValidSeasons(seasons)) return "invalid-length";
  if (!Number.isFinite(wage) || wage < ask) return "wage-too-low";
  return buyerError(career, career.userClubId, 0, wage);
};

/**
 * Signs a free agent for the user's club at any time: no fee, a wage of at least his ask and a
 * contract of `seasons` (1 to 5, default 3). The squad plan is left alone. The input career is
 * not changed.
 */
export const signFreeAgent = (
  career: Career,
  playerId: string,
  wage: number,
  seasons: number = DEFAULT_CONTRACT_SEASONS,
): TransferResult => {
  const error = signError(career, playerId, wage, seasons);
  if (error) return refuse(error);
  const moved = reassign(career, playerId, career.userClubId);
  return { ok: true, career: withContract(moved, playerId, wage, seasons) };
};
