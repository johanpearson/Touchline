import type { Club } from "./club";
import type { Result } from "./compute-table";
import type { Player } from "./player";

const countIn = (ids: readonly string[], members: ReadonlySet<string>): number =>
  ids.filter((id) => members.has(id)).length;

/**
 * Whether the recorded scorers of every result are consistent: one id per goal, and the scorers
 * who still belong to a club are players of the club that scored, never more than its goals. A
 * scorer who has left the league (retired, see `retirePlayers`) is no longer in `players`; such
 * ids fill the goals that the remaining scorers do not account for. A result without scorers
 * (saved before schema v6) is always consistent.
 */
export const scorersBelongToClubs = (
  results: readonly Result[],
  clubs: readonly Club[],
  players: readonly Player[],
): boolean => {
  const playersOf = new Map(clubs.map((c) => [c.id, new Set(c.playerIds)]));
  const known = new Set(players.map((p) => p.id));
  return results.every((r) => {
    if (r.scorers === undefined) return true;
    const home = countIn(r.scorers, playersOf.get(r.homeClubId) ?? new Set<string>());
    const away = countIn(r.scorers, playersOf.get(r.awayClubId) ?? new Set<string>());
    const departed = r.scorers.filter((id) => !known.has(id)).length;
    return (
      r.scorers.length === r.homeGoals + r.awayGoals &&
      home <= r.homeGoals &&
      away <= r.awayGoals &&
      home + away + departed === r.scorers.length
    );
  });
};
