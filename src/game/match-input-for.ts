import {
  createRng,
  type MatchInput,
  NEUTRAL_TACTICS,
  type TeamMatchProfile,
  type TeamTactics,
} from "../engine";
import { autoPickLineup } from "./auto-pick-lineup";
import type { Career } from "./career";
import type { Club } from "./club";
import { deriveLineupProfile } from "./derive-lineup-profile";
import type { Fixture } from "./generate-fixtures";
import type { Lineup } from "./lineup";
import { clubSquad } from "./squad-plan";

const SEED_RANGE = 2 ** 32 - 1;

type SideSetup = { profile: TeamMatchProfile; tactics: TeamTactics };

const clubOf = (career: Career, clubId: string): Club => {
  const club = career.league.clubs.find((c) => c.id === clubId);
  if (!club) throw new RangeError(`Unknown club: ${clubId}`);
  return club;
};

/** The user's saved plan; every AI club plays an auto-picked 4-4-2 with neutral tactics. */
const setupOf = (career: Career, clubId: string): SideSetup => {
  const club = clubOf(career, clubId);
  const squad = clubSquad(club, career.league.players);
  const isUser = clubId === career.userClubId;
  const lineup: Lineup = isUser
    ? career.squadPlan
    : autoPickLineup(squad, "4-4-2", career.condition);
  return {
    profile: deriveLineupProfile(club.name, squad, lineup, career.condition),
    tactics: isUser ? career.squadPlan.tactics : NEUTRAL_TACTICS,
  };
};

/** The engine input for a fixture: the user's club uses its squad plan, AI clubs a 4-4-2. */
export const matchInputFor = (career: Career, fixture: Fixture): MatchInput => {
  const home = setupOf(career, fixture.homeClubId);
  const away = setupOf(career, fixture.awayClubId);
  return {
    home: home.profile,
    away: away.profile,
    homeTactics: home.tactics,
    awayTactics: away.tactics,
  };
};

/**
 * The seed of a fixture's match, derived from the career seed, the season number and the fixture id.
 * The match view, the quick sim and any later replay all use it, so they play the same match.
 */
export const matchSeed = (career: Career, fixture: Fixture): number =>
  createRng(career.seed).fork(`match-${career.season.number}-${fixture.id}`).int(0, SEED_RANGE);
