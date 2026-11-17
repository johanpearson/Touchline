import {
  type Career,
  type Club,
  computeForm,
  computeTable,
  type Outcome,
  type TableRow,
} from "../game";

/** The league table row of one club, with the club itself and its last five outcomes. */
export type LeagueRow = TableRow & { club: Club; form: Outcome[] };

/** Standings in `computeTable` order (tie-breakers unchanged), or no rows if the table cannot be built. */
export function leagueRows(career: Career): LeagueRow[] {
  const result = computeTable(
    career.league.clubs.map((club) => club.id),
    career.season.results,
  );
  if (!result.ok) return [];
  const clubs = new Map(career.league.clubs.map((club) => [club.id, club]));
  return result.table.flatMap((row) => {
    const club = clubs.get(row.clubId);
    return club ? [{ ...row, club, form: computeForm(row.clubId, career.season.results) }] : [];
  });
}
