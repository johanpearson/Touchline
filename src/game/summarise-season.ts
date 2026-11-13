import type { MatchEvent } from "../engine";
import { attributeGoalScorers } from "./attribute-goal-scorers";
import type { Career } from "./career";
import { computeTable, type Result, type TableRow } from "./compute-table";
import type { Fixture } from "./generate-fixtures";
import { isSeasonComplete } from "./is-season-complete";
import { matchSeed } from "./match-input-for";
import { pickBestEleven } from "./pick-best-eleven";
import type { SeasonSummary, SummaryResult, TopScorer } from "./season-summary";
import { toSquadPlayer } from "./to-squad-player";

const TOP_SCORER_COUNT = 5;

export type SummaryOptions = {
  /** How many top scorers to list. Defaults to five. */
  topScorerCount?: number;
};

const goalEvent = (team: "home" | "away"): MatchEvent => ({
  type: "goal",
  time: 0,
  team,
  position: { x: 0.5, y: 0.5 },
  intensity: 1,
  xg: 0,
});

/** One goal event per goal in the stored result, so scorers always add up to the score. */
const goalEventsOf = (result: Result): MatchEvent[] => [
  ...Array.from({ length: result.homeGoals }, () => goalEvent("home")),
  ...Array.from({ length: result.awayGoals }, () => goalEvent("away")),
];

const tallyScorers = (career: Career): TopScorer[] => {
  const fixtures = new Map<string, Fixture>(career.season.fixtures.map((f) => [f.id, f]));
  const squads = new Map(
    career.league.clubs.map((club) => {
      const members = career.league.players.filter((p) => club.playerIds.includes(p.id));
      return [club.id, pickBestEleven(members).map(toSquadPlayer)] as const;
    }),
  );
  const tally = new Map<string, TopScorer>();
  for (const result of career.season.results) {
    const fixture = fixtures.get(result.fixtureId) as Fixture;
    const events = goalEventsOf(result);
    const names = attributeGoalScorers(
      events,
      {
        home: squads.get(result.homeClubId) ?? [],
        away: squads.get(result.awayClubId) ?? [],
      },
      matchSeed(career, fixture),
    );
    events.forEach((event, i) => {
      const clubId = event.team === "home" ? result.homeClubId : result.awayClubId;
      const name = names[i] as string;
      const key = `${clubId}|${name}`;
      tally.set(key, { name, clubId, goals: (tally.get(key)?.goals ?? 0) + 1 });
    });
  }
  return [...tally.values()].sort(
    (a, b) => b.goals - a.goals || a.clubId.localeCompare(b.clubId) || a.name.localeCompare(b.name),
  );
};

/**
 * Summarises a finished season: champion, final table, the user's finish and the top scorers.
 * Scorers are attributed from the stored results, so they always add up to each club's goals.
 * Returns a typed error for an unfinished season.
 */
export const summariseSeason = (career: Career, options: SummaryOptions = {}): SummaryResult => {
  if (!isSeasonComplete(career.season)) return { ok: false, error: "season-incomplete" };
  const clubIds = career.league.clubs.map((c) => c.id);
  const computed = computeTable(clubIds, career.season.results);
  if (!computed.ok) throw new RangeError(`Cannot build the final table: ${computed.error}`);
  const { table } = computed;
  const userRecord = table.find((r) => r.clubId === career.userClubId) as TableRow;
  const summary: SeasonSummary = {
    seasonNumber: career.season.number,
    championId: (table[0] as TableRow).clubId,
    finalTable: table,
    userPosition: userRecord.position,
    userRecord,
    topScorers: tallyScorers(career).slice(0, options.topScorerCount ?? TOP_SCORER_COUNT),
  };
  return { ok: true, summary };
};
