import { createContext, type ReactNode, useCallback, useContext, useMemo, useState } from "react";
import { type Career, type CareerError, createCareer } from "../game";

export type CareerStore = {
  /** The running career, or null before one has been started. */
  career: Career | null;
  /** Starts a career and replaces any running one. Returns an error for an unknown club. */
  startCareer: (seed: number, userClubId: string) => CareerError | null;
};

const CareerContext = createContext<CareerStore | null>(null);

/** Holds the career in memory. M4 replaces the state with the SaveStore without touching screens. */
export function CareerProvider({ children }: { children: ReactNode }) {
  const [career, setCareer] = useState<Career | null>(null);
  const startCareer = useCallback((seed: number, userClubId: string): CareerError | null => {
    const result = createCareer({ seed, userClubId });
    if (!result.ok) return result.error;
    setCareer(result.career);
    return null;
  }, []);
  const value = useMemo(() => ({ career, startCareer }), [career, startCareer]);
  return <CareerContext.Provider value={value}>{children}</CareerContext.Provider>;
}

export function useCareer(): CareerStore {
  const value = useContext(CareerContext);
  if (!value) throw new Error("useCareer must be used inside CareerProvider");
  return value;
}
