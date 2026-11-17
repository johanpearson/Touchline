import { type Career, type Club, computeTable, type Fixture, type Result } from "../game";
import { type LeagueRow, leagueRows } from "./league-rows";

export type MovementDirection = "up" | "down" | "same";
export type Movement = { direction: MovementDirection; places: number };

/** 1-based position of a club in the table made from `results`, or undefined if that has no rows. */
const positionIn = (
  clubIds: readonly string[],
  results: readonly Result[],
  clubId: string,
): number | undefined => {
  const table = computeTable(clubIds, results);
  return table.ok ? table.table.find((row) => row.clubId === clubId)?.position : undefined;
};

/** The club's position before a round; undefined when nothing was played before it. */
export const positionBefore = (
  clubIds: readonly string[],
  earlierResults: readonly Result[],
  clubId: string,
): number | undefined =>
  earlierResults.length === 0 ? undefined : positionIn(clubIds, earlierResults, clubId);

/** How far the club moved, or null when there is no earlier position to compare with. */
export const describeMovement = (before: number | undefined, after: number): Movement | null => {
  if (before === undefined) return null;
  if (after < before) return { direction: "up", places: before - after };
  if (after > before) return { direction: "down", places: after - before };
  return { direction: "same", places: 0 };
};

export type MatchdayRow = {
  fixture: Fixture;
  result: Result;
  home: Club;
  away: Club;
  isUser: boolean;
};

export type MatchdayView = {
  matchday: number;
  /** The user's match first, then the rest in fixture order. */
  rows: MatchdayRow[];
  standings: LeagueRow[];
  userRow: LeagueRow | undefined;
  movement: Movement | null;
  seasonOver: boolean;
};

/** Everything the matchday results screen shows, from the career after the round was played. */
export const buildMatchdayView = (career: Career): MatchdayView => {
  const matchday = career.season.currentMatchday - 1;
  const clubs = new Map(career.league.clubs.map((club) => [club.id, club]));
  const resultByFixture = new Map(career.season.results.map((r) => [r.fixtureId, r]));
  const rows = career.season.fixtures
    .filter((f) => f.matchday === matchday)
    .flatMap((fixture) => {
      const result = resultByFixture.get(fixture.id);
      const home = clubs.get(fixture.homeClubId);
      const away = clubs.get(fixture.awayClubId);
      const isUser =
        fixture.homeClubId === career.userClubId || fixture.awayClubId === career.userClubId;
      return result && home && away ? [{ fixture, result, home, away, isUser }] : [];
    });
  rows.sort((a, b) => Number(b.isUser) - Number(a.isUser));
  const roundFixtureIds = new Set(rows.map((row) => row.fixture.id));
  const earlier = career.season.results.filter((r) => !roundFixtureIds.has(r.fixtureId));
  const standings = leagueRows(career);
  const userRow = standings.find((row) => row.clubId === career.userClubId);
  const before = positionBefore(
    career.league.clubs.map((club) => club.id),
    earlier,
    career.userClubId,
  );
  return {
    matchday,
    rows,
    standings,
    userRow,
    movement: userRow ? describeMovement(before, userRow.position) : null,
    seasonOver:
      career.season.currentMatchday > Math.max(...career.season.fixtures.map((f) => f.matchday)),
  };
};

/** The rows around the user's club: up to `size` consecutive rows that contain it. */
export const standingsWindow = (
  standings: readonly LeagueRow[],
  clubId: string,
  size = 5,
): LeagueRow[] => {
  const index = standings.findIndex((row) => row.clubId === clubId);
  const start = Math.max(0, Math.min(index - Math.floor(size / 2), standings.length - size));
  return standings.slice(start, start + size);
};
