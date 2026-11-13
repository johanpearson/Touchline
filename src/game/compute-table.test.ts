import { describe, expect, it } from "vitest";
import { createRng } from "../engine";
import { computeForm, computeTable, type Result } from "./compute-table";

let nextId = 0;
const aResult = (home: string, homeGoals: number, away: string, awayGoals: number): Result => ({
  fixtureId: `f${nextId++}`,
  homeClubId: home,
  awayClubId: away,
  homeGoals,
  awayGoals,
});

const tableOf = (clubIds: string[], results: Result[]) => {
  const outcome = computeTable(clubIds, results);
  if (!outcome.ok) throw new Error(`Expected table, got ${outcome.error}`);
  return outcome.table;
};

const order = (clubIds: string[], results: Result[]): string[] =>
  tableOf(clubIds, results).map((row) => row.clubId);

describe("computeTable", () => {
  it("lists clubs without results with zeros and positions 1..n", () => {
    expect(tableOf(["b", "a"], [])).toEqual([
      {
        position: 1,
        clubId: "a",
        played: 0,
        won: 0,
        drawn: 0,
        lost: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        goalDifference: 0,
        points: 0,
      },
      {
        position: 2,
        clubId: "b",
        played: 0,
        won: 0,
        drawn: 0,
        lost: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        goalDifference: 0,
        points: 0,
      },
    ]);
  });

  it("awards 3 points for a win and 1 for a draw and records goals", () => {
    const table = tableOf(["a", "b", "c"], [aResult("a", 2, "b", 0), aResult("b", 1, "c", 1)]);
    const row = (id: string) => table.find((r) => r.clubId === id);
    expect(row("a")).toMatchObject({
      played: 1,
      won: 1,
      points: 3,
      goalsFor: 2,
      goalsAgainst: 0,
      goalDifference: 2,
    });
    expect(row("b")).toMatchObject({
      played: 2,
      lost: 1,
      drawn: 1,
      points: 1,
      goalsFor: 1,
      goalsAgainst: 3,
    });
    expect(row("c")).toMatchObject({ played: 1, drawn: 1, points: 1 });
  });

  it("ranks by points before anything else", () => {
    // a has the best goal difference (+4) but b has more points.
    const results = [
      aResult("b", 1, "c", 0),
      aResult("b", 1, "d", 0),
      aResult("a", 5, "d", 0),
      aResult("c", 1, "a", 0),
    ];
    expect(order(["a", "b", "c", "d"], results)).toEqual(["b", "a", "c", "d"]);
  });

  it("separates equal points by goal difference", () => {
    const results = [aResult("a", 3, "c", 0), aResult("b", 1, "d", 0)];
    expect(order(["d", "c", "b", "a"], results)).toEqual(["a", "b", "d", "c"]);
  });

  it("separates equal points and goal difference by goals scored", () => {
    const results = [aResult("b", 1, "d", 0), aResult("a", 3, "c", 2)];
    expect(order(["d", "c", "b", "a"], results)).toEqual(["a", "b", "c", "d"]);
  });

  it("separates equal points, difference and goals by head-to-head points", () => {
    // a and b both end on 3 points with 1 goal for and 1 against; b won the direct match (name order would put a first).
    const results = [aResult("b", 1, "a", 0), aResult("a", 1, "d", 0), aResult("c", 1, "b", 0)];
    const table = tableOf(["a", "b", "c", "d"], results);
    expect(
      table
        .filter((r) => ["a", "b"].includes(r.clubId))
        .map((r) => [r.points, r.goalDifference, r.goalsFor]),
    ).toEqual([
      [3, 0, 1],
      [3, 0, 1],
    ]);
    expect(table.map((r) => r.clubId)).toEqual(["c", "b", "a", "d"]);
  });

  it("splits a three-way tie on points, difference and goals by head-to-head", () => {
    const results = [
      aResult("z", 1, "m", 0),
      aResult("z", 1, "c", 0),
      aResult("m", 1, "c", 0),
      aResult("d", 2, "z", 1),
      aResult("e", 1, "z", 0),
      aResult("m", 2, "d", 1),
      aResult("e", 1, "m", 0),
      aResult("c", 1, "d", 0),
      aResult("c", 2, "e", 1),
    ];
    const table = tableOf(["c", "d", "e", "m", "z"], results);
    const tied = table.filter((r) => ["z", "m", "c"].includes(r.clubId));
    expect(tied.map((r) => [r.points, r.goalDifference, r.goalsFor])).toEqual([
      [6, 0, 3],
      [6, 0, 3],
      [6, 0, 3],
    ]);
    expect(table.map((r) => r.clubId)).toEqual(["e", "z", "m", "c", "d"]);
  });

  it("falls back to club name when nothing else separates clubs", () => {
    const results = [aResult("z", 1, "m", 1), aResult("m", 1, "a", 1), aResult("a", 1, "z", 1)];
    expect(order(["z", "m", "a"], results)).toEqual(["a", "m", "z"]);
  });

  it("rejects a result that references an unknown club", () => {
    expect(computeTable(["a", "b"], [aResult("a", 1, "x", 0)])).toEqual({
      ok: false,
      error: "unknown-club",
    });
  });

  it("rejects a club playing itself", () => {
    expect(computeTable(["a", "b"], [aResult("a", 1, "a", 0)])).toEqual({
      ok: false,
      error: "club-plays-itself",
    });
  });

  it("rejects duplicate fixture ids", () => {
    const first = aResult("a", 1, "b", 0);
    const second = { ...aResult("b", 1, "a", 0), fixtureId: first.fixtureId };
    expect(computeTable(["a", "b"], [first, second])).toEqual({
      ok: false,
      error: "duplicate-fixture-id",
    });
  });

  it("rejects duplicate club ids", () => {
    expect(computeTable(["a", "a"], [])).toEqual({ ok: false, error: "duplicate-club-ids" });
  });

  describe("properties over random seasons", () => {
    const clubIds = ["a", "b", "c", "d", "e", "f"];
    const randomResults = (seed: number): Result[] => {
      const rng = createRng(seed);
      const results: Result[] = [];
      for (const home of clubIds) {
        for (const away of clubIds) {
          if (home === away || rng.chance(0.2)) continue;
          results.push(aResult(home, rng.int(0, 4), away, rng.int(0, 4)));
        }
      }
      return results;
    };

    it("gives 3 points per decisive match and 2 per draw, and balances goals", () => {
      for (let seed = 1; seed <= 50; seed++) {
        const results = randomResults(seed);
        const table = tableOf(clubIds, results);
        const decisive = results.filter((r) => r.homeGoals !== r.awayGoals).length;
        const draws = results.length - decisive;
        expect(table.reduce((sum, r) => sum + r.points, 0)).toBe(decisive * 3 + draws * 2);
        expect(table.reduce((sum, r) => sum + r.goalsFor, 0)).toBe(
          table.reduce((sum, r) => sum + r.goalsAgainst, 0),
        );
      }
    });

    it("does not depend on the order of the results", () => {
      for (let seed = 1; seed <= 50; seed++) {
        const results = randomResults(seed);
        const rng = createRng(seed).fork("shuffle");
        const shuffled = [...results];
        for (let i = shuffled.length - 1; i > 0; i--) {
          const j = rng.int(0, i);
          [shuffled[i], shuffled[j]] = [shuffled[j] as Result, shuffled[i] as Result];
        }
        expect(tableOf(clubIds, shuffled)).toEqual(tableOf(clubIds, results));
      }
    });
  });
});

describe("computeForm", () => {
  const results = [
    aResult("a", 1, "b", 0),
    aResult("c", 2, "d", 2),
    aResult("b", 3, "a", 1),
    aResult("a", 0, "c", 0),
    aResult("d", 0, "a", 1),
  ];

  it("returns the outcomes of the club's matches in match order", () => {
    expect(computeForm("a", results)).toEqual(["W", "L", "D", "W"]);
  });

  it("returns only the last n outcomes", () => {
    expect(computeForm("a", results, 2)).toEqual(["D", "W"]);
  });

  it("returns an empty list for a club without matches", () => {
    expect(computeForm("z", results)).toEqual([]);
  });

  it("defaults to five outcomes", () => {
    const many = Array.from({ length: 8 }, () => aResult("a", 1, "b", 0));
    expect(computeForm("a", many)).toHaveLength(5);
  });
});
