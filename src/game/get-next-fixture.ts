import type { Season } from "./career";
import type { Fixture } from "./generate-fixtures";

/** The club's fixture on the current matchday, or `undefined` when the season is over. */
export const getNextFixture = (season: Season, clubId: string): Fixture | undefined =>
  season.fixtures.find(
    (f) =>
      f.matchday === season.currentMatchday && (f.homeClubId === clubId || f.awayClubId === clubId),
  );
