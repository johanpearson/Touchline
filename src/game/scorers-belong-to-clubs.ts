import type { Club } from "./club";
import type { Result } from "./compute-table";

const countIn = (ids: readonly string[], members: ReadonlySet<string>): number =>
  ids.filter((id) => members.has(id)).length;

/**
 * Whether the recorded scorers of every result are consistent: one id per goal, each id a player of
 * the club that scored, so the scorers add up to the goals of each club. A result without scorers
 * (saved before schema v6) is always consistent.
 */
export const scorersBelongToClubs = (
  results: readonly Result[],
  clubs: readonly Club[],
): boolean => {
  const playersOf = new Map(clubs.map((c) => [c.id, new Set(c.playerIds)]));
  return results.every((r) => {
    if (r.scorers === undefined) return true;
    const home = playersOf.get(r.homeClubId) ?? new Set<string>();
    const away = playersOf.get(r.awayClubId) ?? new Set<string>();
    return (
      countIn(r.scorers, home) === r.homeGoals &&
      countIn(r.scorers, away) === r.awayGoals &&
      r.scorers.length === r.homeGoals + r.awayGoals
    );
  });
};
