import type { Club, Player, Result, Season } from "../game";
import { roundCount } from "./hub-data";

/** The round shown first: the current one, or the last once the season is over. */
export const defaultRound = (season: Season): number =>
  Math.max(1, Math.min(season.currentMatchday, roundCount(season)));

export type Scorers = { home: string[]; away: string[] };

/** Scorer names of a result per side, in the order the goals were scored. Empty without recorded scorers. */
export function scorersOf(
  result: Result,
  home: Club,
  players: ReadonlyMap<string, Player>,
): Scorers {
  const homeIds = new Set(home.playerIds);
  const scorers: Scorers = { home: [], away: [] };
  for (const id of result.scorers ?? []) {
    const name = players.get(id)?.name;
    if (name) scorers[homeIds.has(id) ? "home" : "away"].push(name);
  }
  return scorers;
}
