import { describe, expect, it } from "vitest";
import { addCareerEconomy } from "./add-career-economy";
import type { Career } from "./career";
import { aCareer, deepFreeze } from "./career-builders";
import { parseCareer } from "./parse-career";

/** A v6 career: the current one without the schema v7 fields. */
const legacy = (): Record<string, unknown> => {
  const copy = structuredClone(aCareer(2)) as unknown as Record<string, unknown> & Career;
  for (const key of ["contracts", "finances", "freeAgentIds", "minutes"]) delete copy[key as never];
  for (const p of copy.league.players) delete (p as { potential?: number }).potential;
  return copy;
};

describe("addCareerEconomy", () => {
  it("makes a legacy career parse", () => {
    expect(parseCareer(addCareerEconomy(legacy())).ok).toBe(true);
  });

  it("is deterministic and does not mutate its input", () => {
    const input = deepFreeze(legacy());
    expect(addCareerEconomy(input)).toEqual(addCareerEconomy(input));
  });

  it("starts contracts at the current season", () => {
    const input = legacy() as unknown as Career;
    const moved = { ...input, season: { ...input.season, number: 4 } };
    const result = addCareerEconomy(moved) as Career;
    const expires = Object.values(result.contracts).map((c) => c.expiresSeason);
    expect(Math.min(...expires)).toBe(4);
    expect(Math.max(...expires)).toBe(8);
  });

  it("starts with no free agents and no minutes", () => {
    const result = addCareerEconomy(legacy()) as Career;
    expect(result.freeAgentIds).toEqual([]);
    expect(Object.values(result.minutes).every((m) => m === 0)).toBe(true);
  });

  it("gives potentials that match the stored players", () => {
    const result = addCareerEconomy(legacy()) as Career;
    expect(result.league.players.map((p) => p.id)).toEqual(
      aCareer(2).league.players.map((p) => p.id),
    );
  });

  it.each([
    ["not an object", 5],
    ["no seed", { league: {}, season: { number: 1 } }],
    ["no league", { seed: 1, season: { number: 1 } }],
    ["no season", { seed: 1, league: { players: [] } }],
    ["no players", { seed: 1, league: {}, season: { number: 1 } }],
    ["a broken player", { seed: 1, league: { players: [{ id: "x" }] }, season: { number: 1 } }],
    [
      "a player that is not an object",
      { seed: 1, league: { players: [3] }, season: { number: 1 } },
    ],
  ])("returns %s unchanged", (_name, raw) => {
    expect(addCareerEconomy(raw)).toBe(raw);
  });

  it("returns a career whose league cannot be parsed unchanged", () => {
    const input = legacy() as unknown as Career;
    const broken = { ...input, league: { ...input.league, clubs: [] } };
    expect(addCareerEconomy(broken)).toBe(broken);
  });
});
