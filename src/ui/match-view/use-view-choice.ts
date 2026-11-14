import { useState } from "react";

export type MatchView = "momentum" | "pitch";

const KEY = "touchline.match-view";

const read = (): MatchView => {
  try {
    return window.sessionStorage.getItem(KEY) === "pitch" ? "pitch" : "momentum";
  } catch {
    return "momentum";
  }
};

/** The chosen match view, kept for the browser session; the momentum terrain is the default. */
export const useViewChoice = (): [MatchView, (view: MatchView) => void] => {
  const [view, setView] = useState<MatchView>(read);
  const choose = (next: MatchView) => {
    setView(next);
    try {
      window.sessionStorage.setItem(KEY, next);
    } catch {
      // Storage can be unavailable; the choice then only lasts while the screen is open.
    }
  };
  return [view, choose];
};
