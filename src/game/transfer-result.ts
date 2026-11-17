import type { Career } from "./career";

export type TransferError =
  | "window-closed"
  | "unknown-player"
  | "own-player"
  | "unknown-offer"
  | "invalid-fee"
  | "invalid-length"
  | "fee-too-low"
  | "wage-too-low"
  | "insufficient-funds"
  | "over-wage-budget"
  | "squad-full"
  | "seller-below-minimum";

export type TransferResult = { ok: true; career: Career } | { ok: false; error: TransferError };

export const refuse = (error: TransferError): TransferResult => ({ ok: false, error });
