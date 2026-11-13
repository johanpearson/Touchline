export { attributeGoalScorers } from "./attribute-goal-scorers";
export type {
  Career,
  CareerError,
  CareerResult,
  MatchdayError,
  MatchdayResult,
  Season,
} from "./career";
export type { Club } from "./club";
export { completeMatchday } from "./complete-matchday";
export type { Outcome, Result, TableError, TableResult, TableRow } from "./compute-table";
export { computeForm, computeTable } from "./compute-table";
export type { CareerSpec } from "./create-career";
export { createCareer } from "./create-career";
export { createSeason } from "./create-season";
export { deriveTeamProfile } from "./derive-team-profile";
export type {
  ClubIdentity,
  ClubIdentityError,
  ClubIdentityResult,
} from "./generate-club-identities";
export { CLUB_PLACE_NAMES, generateClubIdentities } from "./generate-club-identities";
export type { Fixture, FixtureError, FixtureResult } from "./generate-fixtures";
export { generateFixtures } from "./generate-fixtures";
export type { LeagueError, LeagueResult, LeagueSpec } from "./generate-league";
export {
  CLUB_COUNT_RANGE,
  DEFAULT_CLUB_COUNT,
  generateLeague,
  LEAGUE_NAMES,
  STRENGTH_SPREAD,
} from "./generate-league";
export type { PlayerSpec } from "./generate-player";
export { generatePlayer } from "./generate-player";
export type { SquadSpec } from "./generate-squad";
export { generateSquad, SQUAD_SHAPE } from "./generate-squad";
export { getNextFixture } from "./get-next-fixture";
export type { League } from "./league";
export { matchInputFor, matchSeed } from "./match-input-for";
export { pickBestEleven } from "./pick-best-eleven";
export type { AttributeName, Player, PlayerAttributes } from "./player";
export { ATTRIBUTE_NAMES, MAX_ATTRIBUTE, MIN_ATTRIBUTE } from "./player";
export { FIRST_NAMES, LAST_NAMES } from "./player-names";
export { simulateFixture } from "./simulate-fixture";
export type { PlayerPosition, SquadPlayer } from "./squad-player";
export { toSquadPlayer } from "./to-squad-player";
