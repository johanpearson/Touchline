import type { MatchInputV1, MatchInputV2, PerSide } from "../engine";
import {
  type Career,
  type Club,
  type Fixture,
  matchInputV1For,
  matchInputV2For,
  matchSeed,
  type SquadPlayer,
  toSquadPlayer,
} from "../game";

type MatchSetupBase = {
  seed: number;
  colours: PerSide<string>;
  squads: PerSide<readonly SquadPlayer[]>;
};

/** A fixture on the zone engine (v1). */
export type ZoneMatchSetup = MatchSetupBase & { engineVersion: 1; input: MatchInputV1 };

/** A fixture on the action engine (v2); the log names players by id, so their names come along. */
export type ActionMatchSetup = MatchSetupBase & {
  engineVersion: 2;
  input: MatchInputV2;
  /** Display name of every player who can appear in the log, by player id. */
  players: Readonly<Record<string, string>>;
};

/** Everything the match screen needs to play one fixture of the career, on the career's engine. */
export type MatchSetup = ZoneMatchSetup | ActionMatchSetup;

const clubOf = (career: Career, clubId: string): Club => {
  const club = career.league.clubs.find((c) => c.id === clubId);
  if (!club) throw new RangeError(`Unknown club: ${clubId}`);
  return club;
};

/** The user's club is limited to its starters and bench, so a substitute can score after half-time. */
const squadOf = (career: Career, club: Club): SquadPlayer[] => {
  const ids = new Set(
    club.id === career.userClubId
      ? [...career.squadPlan.starters, ...career.squadPlan.bench]
      : club.playerIds,
  );
  return career.league.players.filter((p) => ids.has(p.id)).map(toSquadPlayer);
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
  const base = {
    seed: matchSeed(career, fixture),
    colours: coloursOf(home, away),
    squads: { home: squadOf(career, home), away: squadOf(career, away) },
  };
  if (career.engineVersion === 2) {
    return {
      ...base,
      engineVersion: 2,
      input: matchInputV2For(career, fixture),
      players: namesOf(career, [home, away]),
    };
  }
  return { ...base, engineVersion: 1, input: matchInputV1For(career, fixture) };
};
