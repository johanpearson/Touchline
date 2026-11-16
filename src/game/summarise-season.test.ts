import { describe, expect, it } from "vitest";
import { aCareer, deepFreeze } from "./career-builders";
import { computeTable } from "./compute-table";
import { playMatchdays } from "./season-test-helpers";
import { summariseSeason } from "./summarise-season";

const finished = () => playMatchdays(aCareer(), 26);

const summaryOf = (career = finished()) => {
  const result = summariseSeason(career);
  if (!result.ok) throw new Error(result.error);
  return result.summary;
};

describe("summariseSeason", () => {
  it("rejects an unfinished season with a typed error", () => {
    expect(summariseSeason(playMatchdays(aCareer(), 25))).toEqual({
      ok: false,
      error: "season-incomplete",
    });
  });

  it("reports the season number, final table and champion", () => {
    const career = finished();
    const table = computeTable(
      career.league.clubs.map((c) => c.id),
      career.season.results,
    );
    if (!table.ok) throw new Error(table.error);

    const summary = summaryOf(career);

    expect(summary.seasonNumber).toBe(1);
    expect(summary.finalTable).toEqual(table.table);
    expect(summary.championId).toBe(table.table[0]?.clubId);
  });

  it("reports the user's position and record from the final table", () => {
    const career = finished();

    const summary = summaryOf(career);

    const row = summary.finalTable.find((r) => r.clubId === career.userClubId);
    expect(summary.userRecord).toEqual(row);
    expect(summary.userPosition).toBe(row?.position);
  });

  it("lists at most five top scorers, most goals first", () => {
    const { topScorers } = summaryOf();

    expect(topScorers).toHaveLength(5);
    const goals = topScorers.map((s) => s.goals);
    expect(goals).toEqual([...goals].sort((a, b) => b - a));
    expect(goals.every((g) => g > 0)).toBe(true);
  });

  it("is deterministic and does not change its input", () => {
    const career = deepFreeze(finished());

    expect(summaryOf(career)).toEqual(summaryOf(finished()));
  });

  it("is JSON round-trippable", () => {
    const summary = summaryOf();

    expect(JSON.parse(JSON.stringify(summary))).toEqual(summary);
  });

  it("attributes exactly the goals each club scored", () => {
    const career = finished();
    const all = summariseSeason(career, { topScorerCount: Number.POSITIVE_INFINITY });
    if (!all.ok) throw new Error(all.error);

    for (const row of all.summary.finalTable) {
      const attributed = all.summary.topScorers
        .filter((s) => s.clubId === row.clubId)
        .reduce((sum, s) => sum + s.goals, 0);
      expect(attributed).toBe(row.goalsFor);
    }
  });

  it("tallies the scorers recorded in the results", () => {
    const career = finished();
    const names = new Map(career.league.players.map((p) => [p.id, p.name]));
    const expected = new Map<string, number>();
    for (const result of career.season.results) {
      for (const id of result.scorers ?? []) {
        const club = career.league.clubs.find((c) => c.playerIds.includes(id))?.id;
        const key = `${club}|${names.get(id)}`;
        expected.set(key, (expected.get(key) ?? 0) + 1);
      }
    }

    const all = summariseSeason(career, { topScorerCount: Number.POSITIVE_INFINITY });
    if (!all.ok) throw new Error(all.error);

    const actual = new Map(all.summary.topScorers.map((s) => [`${s.clubId}|${s.name}`, s.goals]));
    expect(actual).toEqual(expected);
  });

  it("draws scorers only for results saved without them and still adds up to the goals", () => {
    const career = finished();
    const stripped: typeof career = {
      ...career,
      season: {
        ...career.season,
        results: career.season.results.map((r, i) => {
          if (i % 2 === 0) return r;
          const { scorers: _scorers, ...rest } = r;
          return rest;
        }),
      },
    };

    const all = summariseSeason(stripped, { topScorerCount: Number.POSITIVE_INFINITY });
    if (!all.ok) throw new Error(all.error);

    for (const row of all.summary.finalTable) {
      const attributed = all.summary.topScorers
        .filter((s) => s.clubId === row.clubId)
        .reduce((sum, s) => sum + s.goals, 0);
      expect(attributed).toBe(row.goalsFor);
    }
  });
});
