/** Persists the chosen UI theme. Implemented by platform adapters. */
export type ThemeStore = {
  load: () => string | null;
  save: (theme: string) => void;
};
