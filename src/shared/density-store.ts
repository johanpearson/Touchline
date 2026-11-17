/** Persists the chosen table density. Implemented by platform adapters. */
export type DensityStore = {
  load: () => string | null;
  save: (density: string) => void;
};
