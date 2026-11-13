import type { Season } from "./career";

/** True when the matchday counter is past the last matchday and every fixture has a result. */
export const isSeasonComplete = (season: Season): boolean => {
  const lastMatchday = Math.max(0, ...season.fixtures.map((f) => f.matchday));
  if (season.currentMatchday <= lastMatchday) return false;
  const played = new Set(season.results.map((r) => r.fixtureId));
  return season.fixtures.every((f) => played.has(f.id));
};
