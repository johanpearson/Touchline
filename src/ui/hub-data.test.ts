import { describe, expect, it } from "vitest";
import {
  type Career,
  completeMatchday,
  computeTable,
  createCareer,
  generateLeague,
  getNextFixture,
  type Result,
  simulateFixture,
} from "../game";
import {
  clubComparison,
  goalsPerGame,
  hubSquadStatus,
  lastFivePoints,
  miniTableRows,
  roundCount,
} from "./hub-data";
import { LOW_FITNESS } from "./plan-rows";

const SEED = 11;

const careerAfter = (matchdays: number): Career => {
  const league = generateLeague({ seed: SEED });
  if (!league.ok) throw new Error("league");
  const userClubId = league.league.clubs[0]?.id ?? "";
  const created = createCareer({ seed: SEED, userClubId });
  if (!created.ok) throw new Error("career");
  let career = created.career;
  for (let i = 0; i < matchdays; i++) {
    const fixture = getNextFixture(career.season, userClubId);
    if (!fixture) throw new Error("season over");
    const next = completeMatchday(career, simulateFixture(career, fixture));
    if (!next.ok) throw new Error(next.error);
    career = next.career;
  }
  return career;
};

const result = (id: string, home: string, away: string, hg: number, ag: number): Result => ({
  fixtureId: id,
  homeClubId: home,
  awayClubId: away,
  homeGoals: hg,
  awayGoals: ag,
  engineVersion: 2,
});

describe("roundCount", () => {
  it("is the number of matchdays of the season (26 for 14 clubs)", () => {
    expect(roundCount(careerAfter(0).season)).toBe(26);
  });
});

describe("lastFivePoints", () => {
  it("adds 3 per win and 1 per draw over the last five matches only", () => {
    const results = [
      result("1", "a", "b", 0, 3),
      result("2", "a", "c", 1, 0),
      result("3", "d", "a", 1, 1),
      result("4", "a", "e", 2, 0),
      result("5", "f", "a", 0, 1),
      result("6", "a", "g", 0, 2),
    ];
    expect(lastFivePoints("a", results)).toEqual({ points: 10, played: 5 });
  });

  it("counts fewer than five matches early in the season", () => {
    expect(lastFivePoints("a", [result("1", "a", "b", 1, 1)])).toEqual({ points: 1, played: 1 });
  });

  it("is empty without results", () => {
    expect(lastFivePoints("a", [])).toEqual({ points: 0, played: 0 });
  });
});

describe("goalsPerGame", () => {
  it("is goals scored divided by matches played, home and away", () => {
    const results = [result("1", "a", "b", 2, 0), result("2", "c", "a", 0, 1)];
    expect(goalsPerGame("a", results)).toBe(1.5);
  });

  it("is null before the club has played", () => {
    expect(goalsPerGame("a", [])).toBeNull();
  });
});

describe("miniTableRows", () => {
  const rows = (n: number) =>
    Array.from({ length: n }, (_, i) => ({ position: i + 1, clubId: `c${i + 1}` }));
  const positions = (list: { position: number }[]) => list.map((r) => r.position);

  it("shows three clubs above and three below the user's club", () => {
    expect(positions(miniTableRows(rows(14), "c8"))).toEqual([5, 6, 7, 8, 9, 10, 11]);
  });

  it("keeps seven rows when the user's club leads the table", () => {
    expect(positions(miniTableRows(rows(14), "c1"))).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it("keeps seven rows when the user's club is last", () => {
    expect(positions(miniTableRows(rows(14), "c14"))).toEqual([8, 9, 10, 11, 12, 13, 14]);
  });

  it("shows everything for a small table", () => {
    expect(positions(miniTableRows(rows(4), "c2"))).toEqual([1, 2, 3, 4]);
  });
});

describe("clubComparison", () => {
  it("has no position, form or goals before the first match", () => {
    const career = careerAfter(0);
    const opponent = career.league.clubs[1];
    const c = clubComparison(career, career.userClubId);
    expect(c.position).toBeNull();
    expect(c.form).toEqual({ points: 0, played: 0 });
    expect(c.goalsPerGame).toBeNull();
    expect(c.rating).toBeGreaterThan(0);
    expect(clubComparison(career, opponent?.id ?? "").position).toBeNull();
  });

  it("reads position, form and goals per game from the career", () => {
    const career = careerAfter(3);
    const table = computeTable(
      career.league.clubs.map((c) => c.id),
      career.season.results,
    );
    if (!table.ok) throw new Error("table");
    const c = clubComparison(career, career.userClubId);
    expect(c.position).toBe(table.table.find((r) => r.clubId === career.userClubId)?.position);
    expect(c.form.played).toBe(3);
    const row = table.table.find((r) => r.clubId === career.userClubId);
    expect(c.goalsPerGame).toBe((row?.goalsFor ?? 0) / 3);
  });
});

describe("hubSquadStatus", () => {
  it("averages fitness and form of the starting eleven", () => {
    const career = careerAfter(0);
    const status = hubSquadStatus(career);
    expect(status.fitness).toBe(100);
    expect(status.form).toBe(5);
    expect(status.low).toEqual([]);
  });

  it("lists squad players below the low-fitness threshold, lowest first", () => {
    const career = careerAfter(0);
    const [a, b, c] = career.squadPlan.starters;
    if (!a || !b || !c) throw new Error("starters");
    const tired: Career = {
      ...career,
      condition: {
        ...career.condition,
        [a]: { fitness: 40, form: 5 },
        [b]: { fitness: LOW_FITNESS - 20, form: 5 },
        [c]: { fitness: LOW_FITNESS, form: 5 },
      },
    };
    const status = hubSquadStatus(tired);
    expect(status.low.map((p) => p.player.id)).toEqual([b, a]);
    expect(status.low[0]?.fitness).toBe(30);
    expect(status.fitness).toBeLessThan(100);
  });
});
