import {
  type Career,
  DEFAULT_CONTRACT_SEASONS,
  isWindowOpen,
  MAX_SQUAD_SIZE,
  squadLimits,
  type TransferError,
  wageBill,
  wageBudget,
} from "../../game";
import type { MessageKey } from "../../i18n";

/** Every refusal of a transfer action. A test checks that each has a message in both languages. */
export const TRANSFER_ERRORS = [
  "window-closed",
  "unknown-player",
  "own-player",
  "unknown-offer",
  "invalid-fee",
  "invalid-length",
  "fee-too-low",
  "wage-too-low",
  "insufficient-funds",
  "over-wage-budget",
  "squad-full",
  "seller-below-minimum",
] as const satisfies readonly TransferError[];

export const transferErrorKey = (error: TransferError): MessageKey => `market.error.${error}`;

export const DEFAULT_SEASONS = DEFAULT_CONTRACT_SEASONS;

export type BlockedReason = "window-closed" | "squad-full";

const squadIsFull = (career: Career): boolean =>
  squadLimits(career, career.userClubId).count >= MAX_SQUAD_SIZE;

/** Why the user cannot buy or sell between clubs right now, or null. */
export const buyBlockedReason = (career: Career): BlockedReason | null => {
  if (!isWindowOpen(career)) return "window-closed";
  return squadIsFull(career) ? "squad-full" : null;
};

/** Free agents can be signed at any time; only a full squad stops it. */
export const signBlockedReason = (career: Career): "squad-full" | null =>
  squadIsFull(career) ? "squad-full" : null;

export type MarketSummary = {
  balance: number;
  wageBill: number;
  wageBudget: number;
  squadCount: number;
  squadMax: number;
};

/** The numbers the market header shows; they change with every transfer. */
export const marketSummary = (career: Career): MarketSummary => {
  const finance = career.finances[career.userClubId] ?? { balance: 0, baseIncome: 0 };
  return {
    balance: finance.balance,
    wageBill: wageBill(career, career.userClubId),
    wageBudget: wageBudget(finance),
    squadCount: squadLimits(career, career.userClubId).count,
    squadMax: MAX_SQUAD_SIZE,
  };
};

/** A whole number from an input, or NaN, which the game refuses as an invalid fee or wage. */
export const parseWholeNumber = (text: string): number =>
  /^\s*\d+\s*$/.test(text) ? Number.parseInt(text, 10) : Number.NaN;
