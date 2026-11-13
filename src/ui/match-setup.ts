import type { MatchInput, PerSide } from "../engine";
import {
  type Career,
  type Club,
  type Fixture,
  matchInputFor,
  matchSeed,
  type SquadPlayer,
  toSquadPlayer,
} from "../game";

/** Everything the match screen needs to play one fixture of the career. */
export type MatchSetup = {
  input: MatchInput;
  seed: number;
  colours: PerSide<string>;
  squads: PerSide<readonly SquadPlayer[]>;
};

const clubOf = (career: Career, clubId: string): Club => {
  const club = career.league.clubs.find((c) => c.id === clubId);
  if (!club) throw new RangeError(`Unknown club: ${clubId}`);
  return club;
};

const squadOf = (career: Career, club: Club): SquadPlayer[] => {
  const ids = new Set(club.playerIds);
  return career.league.players.filter((p) => ids.has(p.id)).map(toSquadPlayer);
};

/** Home plays in its primary colour; the away side switches to its secondary on a clash. */
const coloursOf = (home: Club, away: Club): PerSide<string> => ({
  home: home.colours.primary,
  away:
    away.colours.primary === home.colours.primary ? away.colours.secondary : away.colours.primary,
});

/** The match input and seed come from `game`, so the match view and the quick sim play the same match. */
export const matchSetupFor = (career: Career, fixture: Fixture): MatchSetup => {
  const home = clubOf(career, fixture.homeClubId);
  const away = clubOf(career, fixture.awayClubId);
  return {
    input: matchInputFor(career, fixture),
    seed: matchSeed(career, fixture),
    colours: coloursOf(home, away),
    squads: { home: squadOf(career, home), away: squadOf(career, away) },
  };
};
