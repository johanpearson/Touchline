import { describe, expect, it } from "vitest";
import type { Club } from "./club";
import { deriveTeamProfile } from "./derive-team-profile";
import {
  CLUB_COUNT_RANGE,
  DEFAULT_CLUB_COUNT,
  generateLeague,
  LEAGUE_NAMES,
  STRENGTH_SPREAD,
} from "./generate-league";
import type { League } from "./league";

const leagueOf = (seed: number, clubCount?: number): League => {
  const result = generateLeague({ seed, clubCount });
  if (!result.ok) throw new Error(`Expected a league, got ${result.error}`);
  return result.league;
};

describe("generateLeague", () => {
  it("defaults to 14 clubs", () => {
    expect(DEFAULT_CLUB_COUNT).toBe(14);
    expect(leagueOf(1).clubs).toHaveLength(14);
  });

  it.each([12, 14, 16])("accepts %i clubs", (count) => {
    expect(leagueOf(1, count).clubs).toHaveLength(count);
  });

  it.each([11, 13, 10, 0, 18, 17, 14.5, Number.NaN])("rejects %s clubs", (count) => {
    expect(generateLeague({ seed: 1, clubCount: count })).toEqual({
      ok: false,
      error: "invalid-club-count",
    });
  });

  it("exposes the allowed club count range", () => {
    expect(CLUB_COUNT_RANGE).toEqual({ min: 12, max: 16 });
  });

  it("names the league from the fictional pool", () => {
    const league = leagueOf(3);
    expect(LEAGUE_NAMES).toContain(league.name);
    expect(league.id).toMatch(/^[a-z0-9-]+$/);
  });

  it("gives every club 22 uniquely identified players", () => {
    const league = leagueOf(2);
    for (const club of league.clubs) expect(club.playerIds).toHaveLength(22);
    const ids = league.players.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toHaveLength(14 * 22);
  });

  it("makes every player belong to exactly one club", () => {
    const league = leagueOf(2);
    const owned = league.clubs.flatMap((c) => c.playerIds);
    expect(new Set(owned).size).toBe(owned.length);
    expect([...owned].sort()).toEqual(league.players.map((p) => p.id).sort());
  });

  it("gives clubs unique ids and names", () => {
    const league = leagueOf(4);
    expect(new Set(league.clubs.map((c) => c.id)).size).toBe(14);
    expect(new Set(league.clubs.map((c) => c.name)).size).toBe(14);
  });

  it("gives the same seed an identical league", () => {
    expect(leagueOf(7)).toEqual(leagueOf(7));
  });

  it("gives different seeds different leagues", () => {
    expect(leagueOf(7)).not.toEqual(leagueOf(8));
  });

  it("survives a JSON round trip unchanged", () => {
    const league = leagueOf(5);
    expect(JSON.parse(JSON.stringify(league))).toEqual(league);
  });

  it("spreads club strengths from clear underdogs to clear favourites", () => {
    const league = leagueOf(6);
    const ratings = league.clubs.map((club) => {
      const { name: _name, ...phases } = deriveTeamProfile(club, league.players);
      const values = Object.values(phases);
      return values.reduce((s, v) => s + v, 0) / values.length;
    });
    expect(Math.max(...ratings) - Math.min(...ratings)).toBeGreaterThan(0.25);
  });

  it("keeps the strength spread within 0 to 1 and orders its bounds", () => {
    expect(STRENGTH_SPREAD.min).toBeLessThan(STRENGTH_SPREAD.max);
    expect(STRENGTH_SPREAD.min).toBeGreaterThanOrEqual(0);
    expect(STRENGTH_SPREAD.max).toBeLessThanOrEqual(1);
  });

  it("does not order club strength by club position in the list", () => {
    const league = leagueOf(9);
    const first = deriveTeamProfile(league.clubs[0] as Club, league.players);
    const last = deriveTeamProfile(league.clubs[13] as Club, league.players);
    expect(first).not.toEqual(last);
  });
});
