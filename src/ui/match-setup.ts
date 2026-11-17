import type { MatchInput, PerSide } from "../engine";
import {
  type Career,
  type Club,
  type CoachedMatch,
  chooseKits,
  createCoachedMatch,
  type Fixture,
  type Kit,
  matchInputFor,
  matchSeed,
} from "../game";

/** Everything the match screen needs to play one fixture of the career. */
export type MatchSetup = {
  seed: number;
  /** The kits actually worn: the away side changes on a colour clash. */
  kits: PerSide<Kit>;
  /** Body colour of each worn kit. */
  colours: PerSide<string>;
  input: MatchInput;
  /** Creates the match with the AI club's substitutions and shouts, as the quick sim plays it. */
  createMatch: () => CoachedMatch;
  /** Display name of every player who can appear in the log, by player id. */
  players: Readonly<Record<string, string>>;
};

const clubOf = (career: Career, clubId: string): Club => {
  const club = career.league.clubs.find((c) => c.id === clubId);
  if (!club) throw new RangeError(`Unknown club: ${clubId}`);
  return club;
};

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
  const kits = chooseKits(home, away);
  return {
    seed: matchSeed(career, fixture),
    kits,
    colours: { home: kits.home.body, away: kits.away.body },
    input: matchInputFor(career, fixture),
    createMatch: () => createCoachedMatch(career, fixture),
    players: namesOf(career, [home, away]),
  };
};
