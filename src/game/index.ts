export { attributeGoalScorers } from "./attribute-goal-scorers";
export { autoPickLineup } from "./auto-pick-lineup";
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
export { deriveLineupProfile } from "./derive-lineup-profile";
export { deriveTeamProfile } from "./derive-team-profile";
export type { Formation } from "./formation";
export { FORMATION_SHAPE, FORMATIONS } from "./formation";
export type { PhaseRating } from "./formation-offsets";
export { FORMATION_OFFSETS, MAX_FORMATION_OFFSET, PHASE_RATINGS } from "./formation-offsets";
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
export { isSeasonComplete } from "./is-season-complete";
export type { League } from "./league";
export type { Lineup, LineupError, LineupResult } from "./lineup";
export { BENCH_SIZE, validateLineup } from "./lineup";
export { matchInputFor, matchSeed } from "./match-input-for";
export type { CareerParseError, CareerParseResult } from "./parse-career";
export { parseCareer } from "./parse-career";
export { pickBestEleven } from "./pick-best-eleven";
export type { AttributeName, Player, PlayerAttributes } from "./player";
export { ATTRIBUTE_NAMES, MAX_ATTRIBUTE, MIN_ATTRIBUTE } from "./player";
export type { MatchAppearance, MatchOutcome, PlayerCondition } from "./player-condition";
export {
  applyMatchToCondition,
  effectiveAttributes,
  FITNESS_ATTRIBUTE_WEIGHT,
  FITNESS_DRAIN_PER_MATCH,
  FITNESS_RECOVERY_RATE,
  FORM_ATTRIBUTE_STEP,
  FORM_MAX,
  FORM_MIN,
  FORM_START,
  initialCondition,
  recoverCondition,
} from "./player-condition";
export { FIRST_NAMES, LAST_NAMES } from "./player-names";
export { playerOverall } from "./player-overall";
export type { SeasonError, SeasonSummary, SummaryResult, TopScorer } from "./season-summary";
export { simulateFixture } from "./simulate-fixture";
export type { PlayerPosition, SquadPlayer } from "./squad-player";
export type { NextSeasonResult } from "./start-next-season";
export { startNextSeason } from "./start-next-season";
export type { SummaryOptions } from "./summarise-season";
export { summariseSeason } from "./summarise-season";
export { toSquadPlayer } from "./to-squad-player";
