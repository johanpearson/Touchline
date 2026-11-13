import { createContext, type ReactNode, useCallback, useContext, useMemo, useState } from "react";
import {
  type Career,
  type CareerError,
  completeMatchday,
  createCareer,
  type MatchdayError,
  type Result,
  startNextSeason,
} from "../game";

export type CareerStore = {
  /** The running career, or null before one has been started. */
  career: Career | null;
  /** Starts a career and replaces any running one. Returns an error for an unknown club. */
  startCareer: (seed: number, userClubId: string) => CareerError | null;
  /** Records the user's result, simulates the rest of the round and moves to the next matchday. */
  completeMatch: (userResult: Result) => MatchdayError | null;
  /** Rolls a finished season over to the next one. Returns an error while the season is running. */
  startNextSeason: () => "season-incomplete" | null;
};

const CareerContext = createContext<CareerStore | null>(null);

/**
 * Holds the career in memory. M4 replaces the state with the SaveStore without touching screens.
 * Until then a reload loses the career; this is deliberately not shown to the user.
 */
export function CareerProvider({ children }: { children: ReactNode }) {
  const [career, setCareer] = useState<Career | null>(null);
  const startCareer = useCallback((seed: number, userClubId: string): CareerError | null => {
    const result = createCareer({ seed, userClubId });
    if (!result.ok) return result.error;
    setCareer(result.career);
    return null;
  }, []);
  const completeMatch = useCallback(
    (userResult: Result): MatchdayError | null => {
      if (!career) return "season-complete";
      const outcome = completeMatchday(career, userResult);
      if (!outcome.ok) return outcome.error;
      setCareer(outcome.career);
      return null;
    },
    [career],
  );
  const rollOver = useCallback((): "season-incomplete" | null => {
    if (!career) return "season-incomplete";
    const outcome = startNextSeason(career);
    if (!outcome.ok) return outcome.error;
    setCareer(outcome.career);
    return null;
  }, [career]);
  const value = useMemo(
    () => ({ career, startCareer, completeMatch, startNextSeason: rollOver }),
    [career, startCareer, completeMatch, rollOver],
  );
  return <CareerContext.Provider value={value}>{children}</CareerContext.Provider>;
}

export function useCareer(): CareerStore {
  const value = useContext(CareerContext);
  if (!value) throw new Error("useCareer must be used inside CareerProvider");
  return value;
}
