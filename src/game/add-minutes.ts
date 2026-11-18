import type { Career } from "./career";
import { type AiReports, type MatchReport, minutesOf } from "./update-condition";

/**
 * The season minutes of every player after a round: the minutes already on the career plus what
 * each club's players played in this round (the user's from the match report, AI clubs from their reports or 90 for the starters).
 * Lineups are read from the career before the round. The input is not changed.
 */
export const addMinutes = (
  career: Career,
  report?: MatchReport,
  aiReports: AiReports = {},
): Record<string, number> => {
  const next: Record<string, number> = { ...career.minutes };
  for (const club of career.league.clubs) {
    const played = minutesOf(career, club.id, report, aiReports);
    for (const [playerId, minutes] of Object.entries(played)) {
      if (minutes > 0) next[playerId] = (next[playerId] ?? 0) + minutes;
    }
  }
  return next;
};
