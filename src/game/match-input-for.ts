import {
  createRng,
  type MatchInput,
  NEUTRAL_TACTICS,
  type TeamSheet,
  type TeamTactics,
} from "../engine";
import { autoPickLineup } from "./auto-pick-lineup";
import type { Career } from "./career";
import type { Club } from "./club";
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

/** The eleven and bench an AI club kicks off with: an auto-picked 4-4-2 at the current condition. */
export const aiLineupFor = (career: Career, clubId: string): Lineup =>
  autoPickLineup(
    clubSquad(clubOf(career, clubId), career.league.players),
    "4-4-2",
    career.condition,
  );

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

const sheetOf = (career: Career, setup: SideSetup): TeamSheet => ({
  name: setup.club.name,
  formation: formationShape(setup.lineup.formation),
  starters: toEnginePlayers(setup.lineup, setup.squad, career.condition),
  bench: toEngineBench(setup.lineup, setup.squad, career.condition),
  tactics: setup.tactics,
});

/** The engine input for a fixture: the user's club uses its squad plan, AI clubs an auto-picked 4-4-2. */
export const matchInputFor = (career: Career, fixture: Fixture): MatchInput => ({
  engineVersion: 2,
  home: sheetOf(career, setupOf(career, fixture.homeClubId)),
  away: sheetOf(career, setupOf(career, fixture.awayClubId)),
});

/**
 * The seed of a fixture's match, derived from the career seed, the season number and the fixture id.
 * The match view, the quick sim and any later replay all use it, so they play the same match.
 */
export const matchSeed = (career: Career, fixture: Fixture): number =>
  createRng(career.seed).fork(`match-${career.season.number}-${fixture.id}`).int(0, SEED_RANGE);
