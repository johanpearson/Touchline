import type { LocaleStore } from "../shared";

const storageKey = "touchline.locale";

export function createMemoryLocaleStore(initial: string | null = null): LocaleStore {
  let current = initial;
  return {
    load: () => current,
    save: (locale) => {
      current = locale;
    },
  };
}

/** Browser adapter. Storage failures (private mode, blocked storage) are ignored. */
export function createBrowserLocaleStore(storage?: Storage): LocaleStore {
  // Reading `window.localStorage` itself can throw when storage is blocked, so it happens inside the try.
  return {
    load: () => {
      try {
        return (storage ?? window.localStorage).getItem(storageKey);
      } catch {
        return null;
      }
    },
    save: (locale) => {
      try {
        (storage ?? window.localStorage).setItem(storageKey, locale);
      } catch {
        // Persisting the locale is best effort.
      }
    },
  };
}
