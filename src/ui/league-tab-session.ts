export type LeagueTab = "table" | "fixtures";

const KEY = "touchline.league.tab";

/** The league tab last used, remembered for the browser session (sessionStorage; the table when unavailable). */
export function loadLeagueTab(): LeagueTab {
  try {
    return window.sessionStorage.getItem(KEY) === "fixtures" ? "fixtures" : "table";
  } catch {
    return "table";
  }
}

export function saveLeagueTab(tab: LeagueTab): void {
  try {
    window.sessionStorage.setItem(KEY, tab);
  } catch {
    // Storage can be blocked; the tab then only lasts while the screen is open.
  }
}
