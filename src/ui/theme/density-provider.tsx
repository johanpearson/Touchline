import { createContext, type ReactNode, useContext, useMemo, useState } from "react";
import type { DensityStore } from "../../shared";
import { DEFAULT_DENSITY, type Density, isDensity } from "./density";

type DensityContextValue = { density: Density; setDensity: (density: Density) => void };

const DensityContext = createContext<DensityContextValue | null>(null);

type Props = { store: DensityStore; children: ReactNode };

/** Keeps the table density in state and remembers it. */
export function DensityProvider({ store, children }: Props) {
  const [density, setDensityState] = useState<Density>(() => {
    const saved = store.load();
    return isDensity(saved) ? saved : DEFAULT_DENSITY;
  });

  const value = useMemo<DensityContextValue>(
    () => ({
      density,
      setDensity: (next) => {
        store.save(next);
        setDensityState(next);
      },
    }),
    [density, store],
  );

  return <DensityContext.Provider value={value}>{children}</DensityContext.Provider>;
}

export function useDensity(): DensityContextValue {
  const value = useContext(DensityContext);
  if (!value) throw new Error("useDensity must be used inside DensityProvider");
  return value;
}
