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
  /** What the user's opponent played in this match (substitutions and shouts of the AI club). */
  opponent?: MatchReport;
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
      const extraFatigue = (club.id === career.userClubId ? report : aiReports[club.id])?.fatigue?.[
        id
      ];
      const played = applyMatchToCondition(before, {
        minutes: minutes[id] ?? 0,
        outcome,
        extraFatigue,
      });
      next[id] = recoverCondition(played);
    }
  }
  return next;
};
