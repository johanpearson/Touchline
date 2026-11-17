import { describe, expect, it } from "vitest";
import type { Result } from "../game";
import { defaultRound, scorersOf } from "./fixtures-logic";
import { careerAfter } from "./test-career";

describe("defaultRound", () => {
  it("is the current matchday", () => {
    expect(defaultRound(careerAfter(3).season)).toBe(4);
  });

  it("is the last round once the season is over", () => {
    expect(defaultRound(careerAfter(26).season)).toBe(26);
  });
});

describe("scorersOf", () => {
  const career = careerAfter(1);
  const players = new Map(career.league.players.map((p) => [p.id, p]));
  const home = career.league.clubs[0];
  const away = career.league.clubs[1];
  if (!home || !away) throw new Error("clubs");
  const [h1, h2] = home.playerIds;
  const [a1] = away.playerIds;
  const result = (scorers?: string[]): Result => ({
    fixtureId: "f",
    homeClubId: home.id,
    awayClubId: away.id,
    homeGoals: 2,
    awayGoals: 1,
    engineVersion: 2,
    scorers,
  });
  const nameOf = (id: string | undefined) => players.get(id ?? "")?.name;

  it("splits scorers by side and keeps the order of the goals", () => {
    const scorers = scorersOf(result([h1 ?? "", a1 ?? "", h2 ?? ""]), home, players);
    expect(scorers.home).toEqual([nameOf(h1), nameOf(h2)]);
    expect(scorers.away).toEqual([nameOf(a1)]);
  });

  it("is empty when no scorers were recorded", () => {
    expect(scorersOf(result(undefined), home, players)).toEqual({ home: [], away: [] });
  });

  it("skips players that no longer exist", () => {
    expect(scorersOf(result(["gone"]), home, players)).toEqual({ home: [], away: [] });
  });
});
