import {
  createRng,
  type MatchInput,
  type MatchInputV1,
  type MatchInputV2,
  NEUTRAL_TACTICS,
  type TeamMatchProfile,
  type TeamSheet,
  type TeamTactics,
} from "../engine";
import { autoPickLineup } from "./auto-pick-lineup";
import type { Career } from "./career";
import type { Club } from "./club";
import { deriveLineupProfile } from "./derive-lineup-profile";
import { formationShape } from "./formation-shape";
import type { Fixture } from "./generate-fixtures";
import type { Lineup } from "./lineup";
import { clubSquad } from "./squad-plan";
import { toEngineBench, toEnginePlayers } from "./to-engine-players";

const SEED_RANGE = 2 ** 32 - 1;

type SideSetup = {
  club: Club;
  squad: ReturnType<typeof clubSquad>;
  lineup: Lineup;
  tactics: TeamTactics;
};

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
  return {
    club,
    squad,
    lineup: isUser ? career.squadPlan : autoPickLineup(squad, "4-4-2", career.condition),
    tactics: isUser ? career.squadPlan.tactics : NEUTRAL_TACTICS,
  };
};

const profileOf = (career: Career, setup: SideSetup): TeamMatchProfile =>
  deriveLineupProfile(setup.club.name, setup.squad, setup.lineup, career.condition);

const sheetOf = (career: Career, setup: SideSetup): TeamSheet => ({
  name: setup.club.name,
  formation: formationShape(setup.lineup.formation),
  starters: toEnginePlayers(setup.lineup, setup.squad, career.condition),
  bench: toEngineBench(setup.lineup, setup.squad, career.condition),
  tactics: setup.tactics,
});

/** The zone-engine (v1) input for a fixture: the user's club uses its squad plan, AI clubs a 4-4-2. */
export const matchInputV1For = (career: Career, fixture: Fixture): MatchInputV1 => {
  const home = setupOf(career, fixture.homeClubId);
  const away = setupOf(career, fixture.awayClubId);
  return {
    home: profileOf(career, home),
    away: profileOf(career, away),
    homeTactics: home.tactics,
    awayTactics: away.tactics,
  };
};

/** The action-engine (v2) input for a fixture, from the same lineups and tactics as v1. */
export const matchInputV2For = (career: Career, fixture: Fixture): MatchInputV2 => ({
  engineVersion: 2,
  home: sheetOf(career, setupOf(career, fixture.homeClubId)),
  away: sheetOf(career, setupOf(career, fixture.awayClubId)),
});

/** The engine input for a fixture on the career's engine version. */
export const matchInputFor = (career: Career, fixture: Fixture): MatchInput =>
  career.engineVersion === 2 ? matchInputV2For(career, fixture) : matchInputV1For(career, fixture);

/**
 * The seed of a fixture's match, derived from the career seed, the season number and the fixture id.
 * The match view, the quick sim and any later replay all use it, so they play the same match.
 */
export const matchSeed = (career: Career, fixture: Fixture): number =>
  createRng(career.seed).fork(`match-${career.season.number}-${fixture.id}`).int(0, SEED_RANGE);
