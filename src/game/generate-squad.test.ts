import { describe, expect, it } from "vitest";
import { createRng } from "../engine";
import { deriveTeamProfile } from "./derive-team-profile";
import { generateSquad, SQUAD_SHAPE } from "./generate-squad";
import { ATTRIBUTE_NAMES, type Player } from "./player";
import type { PlayerPosition } from "./squad-player";

const squadOf = (strength: number, seed = 1, clubId = "kvarnby"): Player[] =>
  generateSquad({ clubId, strength }, createRng(seed));

const countOf = (players: Player[], position: PlayerPosition): number =>
  players.filter((p) => p.position === position).length;

const averageRating = (players: Player[], clubId: string): number => {
  const club = {
    id: clubId,
    name: clubId,
    shortName: "CLB",
    colours: { primary: "#112233", secondary: "#ffffff" },
    playerIds: players.map((p) => p.id),
  };
  const { name: _name, ...ratings } = deriveTeamProfile(club, players);
  const values = Object.values(ratings);
  return values.reduce((s, v) => s + v, 0) / values.length;
};

const overall = (p: Player): number => ATTRIBUTE_NAMES.reduce((s, a) => s + p[a], 0);

describe("generateSquad", () => {
  it("returns 22 players split 3 GK, 7 DEF, 7 MID and 5 FWD", () => {
    const squad = squadOf(0.5);
    expect(squad).toHaveLength(22);
    expect(SQUAD_SHAPE).toEqual({ GK: 3, DEF: 7, MID: 7, FWD: 5 });
    expect(countOf(squad, "GK")).toBe(3);
    expect(countOf(squad, "DEF")).toBe(7);
    expect(countOf(squad, "MID")).toBe(7);
    expect(countOf(squad, "FWD")).toBe(5);
  });

  it("numbers player ids <clubId>-<n> uniquely", () => {
    const squad = squadOf(0.5, 1, "norrvik");
    expect(squad.map((p) => p.id)).toEqual(
      Array.from({ length: 22 }, (_, i) => `norrvik-${i + 1}`),
    );
  });

  it("has no duplicate full names inside a squad", () => {
    for (let seed = 1; seed <= 30; seed++) {
      const names = squadOf(0.5, seed).map((p) => p.name);
      expect(new Set(names).size).toBe(names.length);
    }
  });

  it("gives ages from 17 to 36 with a realistic spread", () => {
    const ages = Array.from({ length: 20 }, (_, i) => squadOf(0.5, i + 1)).flatMap((s) =>
      s.map((p) => p.age),
    );
    expect(Math.min(...ages)).toBeGreaterThanOrEqual(17);
    expect(Math.max(...ages)).toBeLessThanOrEqual(36);
    const mean = ages.reduce((s, a) => s + a, 0) / ages.length;
    expect(mean).toBeGreaterThan(24);
    expect(mean).toBeLessThan(29);
    expect(ages.some((a) => a <= 19)).toBe(true);
    expect(ages.some((a) => a >= 33)).toBe(true);
  });

  it("has a clear quality gradient from best to worst outfield player", () => {
    const outfield = squadOf(0.5)
      .filter((p) => p.position !== "GK")
      .map(overall)
      .sort((a, b) => b - a);
    const top = outfield.slice(0, 5).reduce((s, v) => s + v, 0) / 5;
    const bottom = outfield.slice(-5).reduce((s, v) => s + v, 0) / 5;
    expect(top - bottom).toBeGreaterThan(20);
  });

  it("is deterministic for the same seed and differs between seeds", () => {
    expect(squadOf(0.5, 7)).toEqual(squadOf(0.5, 7));
    expect(squadOf(0.5, 7)).not.toEqual(squadOf(0.5, 8));
  });

  it("does not depend on generation order when streams are forked per club", () => {
    const root = createRng(42);
    const aFirst = generateSquad({ clubId: "a", strength: 0.4 }, root.fork("a"));
    const bSecond = generateSquad({ clubId: "b", strength: 0.6 }, root.fork("b"));
    const bFirst = generateSquad({ clubId: "b", strength: 0.6 }, createRng(42).fork("b"));
    const aSecond = generateSquad({ clubId: "a", strength: 0.4 }, createRng(42).fork("a"));
    expect(bFirst).toEqual(bSecond);
    expect(aSecond).toEqual(aFirst);
  });

  it("matches the snapshot for a fixed seed", () => {
    expect(squadOf(0.5, 2024, "kvarnby")).toMatchSnapshot();
  });

  it("gives a stronger squad a strictly higher derived team rating", () => {
    const rating = (strength: number) => averageRating(squadOf(strength, 3), "kvarnby");
    expect(rating(0.2)).toBeLessThan(rating(0.5));
    expect(rating(0.5)).toBeLessThan(rating(0.8));
  });

  it("rates a strength 0.5 squad about 0.5 on average", () => {
    const ratings = Array.from({ length: 30 }, (_, i) =>
      averageRating(squadOf(0.5, i + 1), "kvarnby"),
    );
    const mean = ratings.reduce((s, r) => s + r, 0) / ratings.length;
    expect(Math.abs(mean - 0.5)).toBeLessThan(0.05);
  });

  it("keeps strengths strictly ordered for every seed", () => {
    for (let seed = 1; seed <= 20; seed++) {
      const r = (s: number) => averageRating(squadOf(s, seed), "kvarnby");
      expect(r(0.2)).toBeLessThan(r(0.5));
      expect(r(0.5)).toBeLessThan(r(0.8));
    }
  });
});
