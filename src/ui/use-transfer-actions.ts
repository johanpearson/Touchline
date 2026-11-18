import { type Dispatch, type SetStateAction, useCallback, useMemo } from "react";
import {
  acceptOffer,
  buyPlayer,
  type Career,
  releasePlayer,
  signFreeAgent,
  type TransferError,
  type TransferResult,
} from "../game";
import type { SaveLineage } from "./autosave-queue";

export type TransferActions = {
  /** Buys a player from an AI club (the window must be open). Returns the refusal, or null when done. */
  buyPlayer: (playerId: string, fee: number, seasons: number) => TransferError | null;
  /** Signs a free agent at any time. Returns the refusal, or null when done. */
  signFreeAgent: (playerId: string, wage: number, seasons: number) => TransferError | null;
  /** Accepts an incoming offer (the window must be open). Returns the refusal, or null when done. */
  acceptOffer: (offerId: string) => TransferError | null;
  /** Releases one of the user's players to the free agents. Returns the refusal, or null when done. */
  releasePlayer: (playerId: string) => TransferError | null;
};

/**
 * The market actions of the career store: each applies the game function, keeps the new career and
 * autosaves it, or returns the refusal and changes nothing.
 */
export function useTransferActions(
  career: Career | null,
  setCareer: Dispatch<SetStateAction<Career | null>>,
  persist: (game: Career, lineage: SaveLineage) => void,
): TransferActions {
  const apply = useCallback(
    (run: (current: Career) => TransferResult, missing: TransferError): TransferError | null => {
      if (!career) return missing;
      const outcome = run(career);
      if (!outcome.ok) return outcome.error;
      setCareer(outcome.career);
      persist(outcome.career, "continue");
      return null;
    },
    [career, setCareer, persist],
  );
  return useMemo(
    () => ({
      buyPlayer: (playerId, fee, seasons) =>
        apply((c) => buyPlayer(c, playerId, fee, seasons), "unknown-player"),
      signFreeAgent: (playerId, wage, seasons) =>
        apply((c) => signFreeAgent(c, playerId, wage, seasons), "unknown-player"),
      acceptOffer: (offerId) =>
        apply((c) => {
          const offer = c.offers.find((o) => o.id === offerId);
          return offer ? acceptOffer(c, offer) : { ok: false, error: "unknown-offer" };
        }, "unknown-offer"),
      releasePlayer: (playerId) => apply((c) => releasePlayer(c, playerId), "unknown-player"),
    }),
    [apply],
  );
}
