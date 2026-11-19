import { autoPickLineup } from "./auto-pick-lineup";
import type { Career } from "./career";
import type { Result } from "./compute-table";
import {
  applyMatchToCondition,
  FITNESS_MATCH_MINUTES,
  initialCondition,
  type MatchOutcome,
  type PlayerCondition,
  recoverCondition,
} from "./player-condition";
import { clubSquad } from "./squad-plan";

/** What happened in the user's match: minutes played per player id (absent means 0). */
export type MatchReport = {
  minutes: Record<string, number>;
  /** Extra fitness lost per player id beyond the minutes (touchline shouts); absent means none. */
  fatigue?: Record<string, number>;
  /**
   * Energy (0 to 100) each player ended the match with, from the engine (`ActionMatchState.energy`);
   * absent means not recorded. A player with an entry is drained by the energy spent instead of the
   * minutes played.
   */
  energy?: Record<string, number>;
  /**
   * The part of `fatigue` the engine's energy does not already charge (the mentality levels of the
   * shouts; pressing and tempo change the energy drain). Used instead of `fatigue` for a player with an
   * entry in `energy`, so a shout is never counted twice.
   */
  mentalityFatigue?: Record<string, number>;
  /** What the user's opponent played in this match (substitutions and shouts of the AI club). */
  opponent?: MatchReport;
};

/** `report` with the energy of `players` taken from `energy` (the engine's per-id map); players not in it keep no entry. */
export const withEnergy = (
  report: MatchReport,
  energy: Readonly<Record<string, number>>,
  players: readonly { id: string }[],
): MatchReport => ({
  ...report,
  energy: Object.fromEntries(
    players.flatMap(({ id }) => (energy[id] === undefined ? [] : [[id, energy[id]]])),
  ),
});

/**
 * The user's report of a finished match with the energy the players ended with. Without a `report`
 * (no changes were made) the starters count as having played 90 minutes.
 */
export const userReportWithEnergy = (
  career: Career,
  report: MatchReport | undefined,
  energy: Readonly<Record<string, number>>,
): MatchReport => {
  const base = report ?? { minutes: fullMatch(career.squadPlan.starters) };
  const club = career.league.clubs.find((c) => c.id === career.userClubId);
  const players = (club?.playerIds ?? []).map((id) => ({ id }));
  return withEnergy(base, energy, players);
};

/** The reports of the AI clubs of a round by club id; a club without one plays its auto-picked 4-4-2 for 90 minutes. */
export type AiReports = Readonly<Record<string, MatchReport>>;

const outcomeOf = (result: Result | undefined, clubId: string): MatchOutcome => {
  if (!result || result.homeGoals === result.awayGoals) return "draw";
  const homeWon = result.homeGoals > result.awayGoals;
  return homeWon === (result.homeClubId === clubId) ? "win" : "defeat";
};

const fullMatch = (ids: readonly string[]): Record<string, number> =>
  Object.fromEntries(ids.map((id) => [id, FITNESS_MATCH_MINUTES]));

/**
 * Minutes played per player id of one club in a round (absent means 0). The user's club follows the
 * report (without one the starters play 90). An AI club follows its report in `aiReports`, or else
 * plays its auto-picked 4-4-2 (with the condition before the round) for 90 minutes.
 */
export const minutesOf = (
  career: Career,
  clubId: string,
  report?: MatchReport,
  aiReports: AiReports = {},
): Record<string, number> => {
  if (clubId === career.userClubId) {
    return report ? report.minutes : fullMatch(career.squadPlan.starters);
  }
  const played = aiReports[clubId];
  if (played) return played.minutes;
  const club = career.league.clubs.find((c) => c.id === clubId);
  if (!club) return {};
  const squad = clubSquad(club, career.league.players);
  return fullMatch(autoPickLineup(squad, "4-4-2", career.condition).starters);
};

/**
 * Condition after a matchday: every player's fitness and form follow the match their club played
 * (`results`), then every player recovers. Lineups are read from the condition as it was before
 * the round, so the outcome never depends on the order the fixtures were processed in.
 */
export const updateConditionAfterMatchday = (
  career: Career,
  results: readonly Result[],
  report?: MatchReport,
  aiReports: AiReports = {},
): Record<string, PlayerCondition> => {
  const next: Record<string, PlayerCondition> = { ...career.condition };
  for (const club of career.league.clubs) {
    const result = results.find((r) => r.homeClubId === club.id || r.awayClubId === club.id);
    const outcome = outcomeOf(result, club.id);
    const minutes = minutesOf(career, club.id, report, aiReports);
    for (const id of club.playerIds) {
      const before = career.condition[id] ?? initialCondition();
      const own = club.id === career.userClubId ? report : aiReports[club.id];
      const energy = own?.energy?.[id];
      const played = applyMatchToCondition(before, {
        minutes: minutes[id] ?? 0,
        outcome,
        extraFatigue: energy === undefined ? own?.fatigue?.[id] : own?.mentalityFatigue?.[id],
        energy,
      });
      next[id] = recoverCondition(played);
    }
  }
  return next;
};
