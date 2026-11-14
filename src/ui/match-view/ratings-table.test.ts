import { describe, expect, it } from "vitest";
import type { ActionPlayerLine } from "../../engine";
import { buildRatingRows } from "./ratings-table";

const line = (overrides: Partial<ActionPlayerLine> = {}): ActionPlayerLine => ({
  passes: 0,
  completedPasses: 0,
  passCompletion: 0,
  keyPasses: 0,
  shots: 0,
  shotsOnTarget: 0,
  xg: 0,
  goals: 0,
  tacklesWon: 0,
  interceptions: 0,
  clearances: 0,
  foulsCommitted: 0,
  ...overrides,
});

const names = { h1: "Ek", h2: "Berg", a1: "Lind", a2: "Strand" };
const played = { home: ["h1", "h2"], away: ["a1", "a2"] };

describe("buildRatingRows", () => {
  it("lists every player who played, including those without a stats line", () => {
    const rows = buildRatingRows({ players: {}, ratings: {}, played, names, userSide: "home" });
    expect(rows.map((r) => r.id).sort()).toEqual(["a1", "a2", "h1", "h2"]);
    expect(rows.every((r) => r.goals === 0 && r.shots === 0 && r.xg === 0)).toBe(true);
  });

  it("puts the user's side first and sorts each side by rating, best first", () => {
    const ratings = { h1: 6.2, h2: 7.4, a1: 8.8, a2: 5.1 };
    const rows = buildRatingRows({ players: {}, ratings, played, names, userSide: "home" });
    expect(rows.map((r) => r.id)).toEqual(["h2", "h1", "a1", "a2"]);
    const away = buildRatingRows({ players: {}, ratings, played, names, userSide: "away" });
    expect(away.map((r) => r.id)).toEqual(["a1", "a2", "h2", "h1"]);
  });

  it("carries goals, key passes, shots and xG from the stats line and resolves names", () => {
    const players = { h1: line({ goals: 2, keyPasses: 1, shots: 4, xg: 1.234 }) };
    const [first] = buildRatingRows({
      players,
      ratings: { h1: 9 },
      played,
      names,
      userSide: "home",
    });
    expect(first).toMatchObject({
      id: "h1",
      name: "Ek",
      side: "home",
      rating: 9,
      goals: 2,
      keyPasses: 1,
      shots: 4,
      xg: 1.234,
    });
  });

  it("marks only the top-rated player of the match", () => {
    const ratings = { h1: 6.2, h2: 7.4, a1: 8.8, a2: 5.1 };
    const rows = buildRatingRows({ players: {}, ratings, played, names, userSide: "home" });
    expect(rows.filter((r) => r.playerOfTheMatch).map((r) => r.id)).toEqual(["a1"]);
  });

  it("breaks rating ties by player id, also for player of the match", () => {
    const ratings = { h1: 7, h2: 7, a1: 7, a2: 7 };
    const rows = buildRatingRows({ players: {}, ratings, played, names, userSide: "home" });
    expect(rows.map((r) => r.id)).toEqual(["h1", "h2", "a1", "a2"]);
    expect(rows.filter((r) => r.playerOfTheMatch).map((r) => r.id)).toEqual(["a1"]);
  });
});
