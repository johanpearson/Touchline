import { type Career, computeTable } from "../../game";

/** The user's club's 1-based place in the league table, or null when the table cannot be built. */
export function userPosition(career: Career): number | null {
  const result = computeTable(
    career.league.clubs.map((club) => club.id),
    career.season.results,
  );
  if (!result.ok) return null;
  return result.table.find((row) => row.clubId === career.userClubId)?.position ?? null;
}
