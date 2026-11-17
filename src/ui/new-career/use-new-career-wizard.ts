import { useCallback, useState } from "react";

export type NewCareerWizard = {
  /** The league picked in step 1, or null until the user has chosen. */
  leagueId: string | null;
  seed: number;
  chooseLeague: (leagueId: string) => void;
  setSeed: (seed: number) => void;
};

/** The choices of the new-career wizard, kept in memory so Back and Next do not lose them. */
export function useNewCareerWizard(initialSeed: number): NewCareerWizard {
  const [leagueId, setLeagueId] = useState<string | null>(null);
  const [seed, setSeedState] = useState(initialSeed);
  const chooseLeague = useCallback((id: string) => setLeagueId(id), []);
  const setSeed = useCallback((value: number) => setSeedState(value), []);
  return { leagueId, seed, chooseLeague, setSeed };
}
