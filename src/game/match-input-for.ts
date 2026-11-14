import { createRng, type MatchInput, NEUTRAL_TACTICS, type TeamMatchProfile } from "../engine";
import type { Career } from "./career";
import { deriveTeamProfile } from "./derive-team-profile";
import type { Fixture } from "./generate-fixtures";

const SEED_RANGE = 2 ** 32 - 1;

const profileOf = (career: Career, clubId: string): TeamMatchProfile => {
  const club = career.league.clubs.find((c) => c.id === clubId);
  if (!club) throw new RangeError(`Unknown club: ${clubId}`);
  return deriveTeamProfile(club, career.league.players);
};

/** The engine input for a fixture: both clubs' derived profiles and, until M5, no tactics. */
export const matchInputFor = (career: Career, fixture: Fixture): MatchInput => ({
  home: profileOf(career, fixture.homeClubId),
  away: profileOf(career, fixture.awayClubId),
  homeTactics: NEUTRAL_TACTICS,
  awayTactics: NEUTRAL_TACTICS,
});

/**
 * The seed of a fixture's match, derived from the career seed, the season number and the fixture id.
 * The match view, the quick sim and any later replay all use it, so they play the same match.
 */
export const matchSeed = (career: Career, fixture: Fixture): number =>
  createRng(career.seed).fork(`match-${career.season.number}-${fixture.id}`).int(0, SEED_RANGE);
