import type { Side } from "../engine";
import type { Career } from "./career";
import { computeTable, type Result, type TableRow } from "./compute-table";
import type { Fixture } from "./generate-fixtures";
import { isSeasonComplete } from "./is-season-complete";
import { matchSeed } from "./match-input-for";
import { pickBestEleven } from "./pick-best-eleven";
import { pickGoalScorers } from "./pick-goal-scorers";
import type { Player } from "./player";
import type { SeasonSummary, SummaryResult, TopScorer } from "./season-summary";
import type { SquadPlayer } from "./squad-player";
import { toSquadPlayer } from "./to-squad-player";

const TOP_SCORER_COUNT = 5;

export type SummaryOptions = {
  /** How many top scorers to list. Defaults to five. */
  topScorerCount?: number;
};

/** The scoring side of every goal in the stored result, home goals first. */
const goalSidesOf = (result: Result): Side[] => [
  ...Array.from({ length: result.homeGoals }, (): Side => "home"),
  ...Array.from({ length: result.awayGoals }, (): Side => "away"),
];

type Scorer = { name: string; clubId: string };

/** The recorded scorers of a result (schema v6), by player name and club; one entry per goal. */
const recordedScorers = (
  scorers: readonly string[],
  playersById: ReadonlyMap<string, Scorer>,
): Scorer[] => scorers.map((id) => playersById.get(id) as Scorer);

/** Results saved before schema v6 have no scorers: draw them from the clubs' best elevens. */
const drawnScorers = (
  career: Career,
  result: Result,
  squads: ReadonlyMap<string, SquadPlayer[]>,
): Scorer[] => {
  const fixture = career.season.fixtures.find((f) => f.id === result.fixtureId) as Fixture;
  const sides = goalSidesOf(result);
  const names = pickGoalScorers(
    sides,
    { home: squads.get(result.homeClubId) ?? [], away: squads.get(result.awayClubId) ?? [] },
    matchSeed(career, fixture),
  );
  return sides.map((side, i) => ({
    name: names[i] as string,
    clubId: side === "home" ? result.homeClubId : result.awayClubId,
  }));
};

const tallyScorers = (career: Career): TopScorer[] => {
  const playersById = new Map<string, Scorer>(
    career.league.clubs.flatMap((club) =>
      club.playerIds.map((id) => {
        const player = career.league.players.find((p) => p.id === id) as Player;
        return [id, { name: player.name, clubId: club.id }] as const;
      }),
    ),
  );
  const squads = new Map(
    career.league.clubs.map((club) => {
      const members = career.league.players.filter((p) => club.playerIds.includes(p.id));
      return [club.id, pickBestEleven(members).map(toSquadPlayer)] as const;
    }),
  );
  const tally = new Map<string, TopScorer>();
  for (const result of career.season.results) {
    const scorers = result.scorers
      ? recordedScorers(result.scorers, playersById)
      : drawnScorers(career, result, squads);
    for (const { name, clubId } of scorers) {
      const key = `${clubId}|${name}`;
      tally.set(key, { name, clubId, goals: (tally.get(key)?.goals ?? 0) + 1 });
    }
  }
  return [...tally.values()].sort(
    (a, b) => b.goals - a.goals || a.clubId.localeCompare(b.clubId) || a.name.localeCompare(b.name),
  );
};

/**
 * Summarises a finished season: champion, final table, the user's finish and the top scorers.
 * Scorers come from the scorers recorded in each result (schema v6), or are drawn for results
 * saved without them, so they always add up to each club's goals.
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
