import type { DensityStore } from "../shared";

export const DENSITY_STORAGE_KEY = "touchline.density";

export function createMemoryDensityStore(initial: string | null = null): DensityStore {
  let current = initial;
  return {
    load: () => current,
    save: (density) => {
      current = density;
    },
  };
}

/** Browser adapter. Storage failures (private mode, blocked storage) are ignored. */
export function createBrowserDensityStore(storage?: Storage): DensityStore {
  // Reading `window.localStorage` itself can throw when storage is blocked, so it happens inside the try.
  return {
    load: () => {
      try {
        return (storage ?? window.localStorage).getItem(DENSITY_STORAGE_KEY);
      } catch {
        return null;
      }
    },
    save: (density) => {
      try {
        (storage ?? window.localStorage).setItem(DENSITY_STORAGE_KEY, density);
      } catch {
        // Persisting the density is best effort.
      }
    },
  };
}
