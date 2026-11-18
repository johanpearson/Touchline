import { type Dispatch, type SetStateAction, useCallback, useMemo } from "react";
import {
  type Career,
  type FinishSeasonError,
  finishSeason,
  type NextSeasonError,
  type RenewError,
  renewContract,
  startNextSeason,
} from "../game";
import type { SaveLineage } from "./autosave-queue";

export type SeasonActions = {
  /** Ends a completed season and opens the off-season. Returns the refusal, or null when done. */
  finishSeason: () => FinishSeasonError | null;
  /** Renews the contract of one of the user's players. Returns the refusal, or null when done. */
  renewContract: (playerId: string, wage: number, seasons: number) => RenewError | null;
  /** Starts the next season once the off-season is open. Returns the refusal, or null when done. */
  startNextSeason: () => NextSeasonError | null;
};

type Outcome = { ok: true; career: Career } | { ok: false; error: string };

/**
 * The season-rollover actions of the career store: each applies the game function, keeps the new
 * career and autosaves it, or returns the refusal and changes nothing.
 */
export function useSeasonActions(
  career: Career | null,
  setCareer: Dispatch<SetStateAction<Career | null>>,
  persist: (game: Career, lineage: SaveLineage) => void,
): SeasonActions {
  const apply = useCallback(
    <E extends string>(run: (current: Career) => Outcome, missing: E): E | null => {
      if (!career) return missing;
      const outcome = run(career);
      if (!outcome.ok) return outcome.error as E;
      setCareer(outcome.career);
      persist(outcome.career, "continue");
      return null;
    },
    [career, setCareer, persist],
  );
  const finish = useCallback(
    () => apply<FinishSeasonError>(finishSeason, "season-incomplete"),
    [apply],
  );
  const renew = useCallback(
    (playerId: string, wage: number, seasons: number) =>
      apply<RenewError>((c) => renewContract(c, playerId, wage, seasons), "unknown-player"),
    [apply],
  );
  const start = useCallback(
    () => apply<NextSeasonError>(startNextSeason, "season-incomplete"),
    [apply],
  );
  return useMemo(
    () => ({ finishSeason: finish, renewContract: renew, startNextSeason: start }),
    [finish, renew, start],
  );
}
