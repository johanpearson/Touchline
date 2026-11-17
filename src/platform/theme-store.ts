import type { ThemeStore } from "../shared";

/** Also read by the inline script in index.html that sets the theme before the first paint. */
export const THEME_STORAGE_KEY = "touchline.theme";

export function createMemoryThemeStore(initial: string | null = null): ThemeStore {
  let current = initial;
  return {
    load: () => current,
    save: (theme) => {
      current = theme;
    },
  };
}

/** Browser adapter. Storage failures (private mode, blocked storage) are ignored. */
export function createBrowserThemeStore(storage?: Storage): ThemeStore {
  // Reading `window.localStorage` itself can throw when storage is blocked, so it happens inside the try.
  return {
    load: () => {
      try {
        return (storage ?? window.localStorage).getItem(THEME_STORAGE_KEY);
      } catch {
        return null;
      }
    },
    save: (theme) => {
      try {
        (storage ?? window.localStorage).setItem(THEME_STORAGE_KEY, theme);
      } catch {
        // Persisting the theme is best effort.
      }
    },
  };
}
