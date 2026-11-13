/** Persists the chosen UI locale. Implemented by platform adapters. */
export type LocaleStore = {
  load: () => string | null;
  save: (locale: string) => void;
};
