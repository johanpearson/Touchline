const PROBE_KEY = "touchline.probe";

/**
 * True when the browser lets the app remember preferences (language, theme, table density).
 * Reading `window.localStorage` can itself throw when storage is blocked, so it happens inside
 * the try.
 */
export function isPreferenceStorageWritable(storage?: Storage): boolean {
  try {
    const target = storage ?? window.localStorage;
    target.setItem(PROBE_KEY, "1");
    target.removeItem(PROBE_KEY);
    return true;
  } catch {
    return false;
  }
}
