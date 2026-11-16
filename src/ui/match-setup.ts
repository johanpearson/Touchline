import type { MatchInput, PerSide } from "../engine";
import { type Career, type Club, type Fixture, matchInputFor, matchSeed } from "../game";

/** Everything the match screen needs to play one fixture of the career. */
export type MatchSetup = {
  seed: number;
  colours: PerSide<string>;
  input: MatchInput;
  /** Display name of every player who can appear in the log, by player id. */
  players: Readonly<Record<string, string>>;
};

const clubOf = (career: Career, clubId: string): Club => {
  const club = career.league.clubs.find((c) => c.id === clubId);
  if (!club) throw new RangeError(`Unknown club: ${clubId}`);
  return club;
};

/** Home plays in its primary colour; the away side switches to its secondary on a clash. */
const coloursOf = (home: Club, away: Club): PerSide<string> => ({
  home: home.colours.primary,
  away:
    away.colours.primary === home.colours.primary ? away.colours.secondary : away.colours.primary,
});

const namesOf = (career: Career, clubs: readonly Club[]): Record<string, string> => {
  const ids = new Set(clubs.flatMap((club) => club.playerIds));
  return Object.fromEntries(
    career.league.players.filter((p) => ids.has(p.id)).map((p) => [p.id, p.name]),
  );
};

/** The match input and seed come from `game`, so the match view and the quick sim play the same match. */
export const matchSetupFor = (career: Career, fixture: Fixture): MatchSetup => {
  const home = clubOf(career, fixture.homeClubId);
  const away = clubOf(career, fixture.awayClubId);
  return {
    seed: matchSeed(career, fixture),
    colours: coloursOf(home, away),
    input: matchInputFor(career, fixture),
    players: namesOf(career, [home, away]),
  };
};
