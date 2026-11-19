import { useState } from "react";
import { PLAYBACK_MODES, type PlaybackMode } from "./director";

export const DEFAULT_PLAYBACK_MODE: PlaybackMode = "extended";

const KEY = "touchline.playback-mode";

/** Kept when storage is unavailable, so the choice still lasts while the page is open. */
let remembered: PlaybackMode | undefined;

const isMode = (value: unknown): value is PlaybackMode =>
  PLAYBACK_MODES.some((mode) => mode === value);

const read = (): PlaybackMode => {
  try {
    const stored = window.localStorage.getItem(KEY);
    return isMode(stored) ? stored : DEFAULT_PLAYBACK_MODE;
  } catch {
    // Storage can be unavailable; fall back to the choice made on this page.
    return remembered ?? DEFAULT_PLAYBACK_MODE;
  }
};

const write = (mode: PlaybackMode) => {
  remembered = mode;
  try {
    window.localStorage.setItem(KEY, mode);
  } catch {
    // Kept in memory above.
  }
};

/**
 * The chosen playback mode, remembered across matches and reloads; Extended is the default.
 * `initial` (a resumed match's mode) is used instead of the remembered one until the user chooses.
 */
export const usePlaybackModeChoice = (
  initial?: PlaybackMode,
): [PlaybackMode, (mode: PlaybackMode) => void] => {
  const [mode, setMode] = useState<PlaybackMode>(() => initial ?? read());
  const choose = (next: PlaybackMode) => {
    setMode(next);
    write(next);
  };
  return [mode, choose];
};
