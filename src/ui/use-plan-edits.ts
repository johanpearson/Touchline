import { type Dispatch, type SetStateAction, useMemo } from "react";
import type { TeamTactics } from "../engine";
import {
  setTactics as applyTactics,
  autoPickUserLineup,
  type Career,
  type Formation,
} from "../game";

export type PlanEdits = {
  /** Replaces the user's tactics. */
  setTactics: (tactics: TeamTactics) => void;
  /** Auto-picks starters and bench for a formation, keeping the tactics. */
  autoPickLineup: (formation: Formation) => void;
};

/** The squad plan edits of the career store; they are saved with the next autosave. */
export function usePlanEdits(setCareer: Dispatch<SetStateAction<Career | null>>): PlanEdits {
  return useMemo(
    () => ({
      setTactics: (tactics) =>
        setCareer((current) => (current ? applyTactics(current, tactics) : current)),
      autoPickLineup: (formation) =>
        setCareer((current) => (current ? autoPickUserLineup(current, formation) : current)),
    }),
    [setCareer],
  );
}
