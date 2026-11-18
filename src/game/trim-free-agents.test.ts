import fc from "fast-check";
import { describe, expect, it } from "vitest";
import type { Career } from "./career";
import { aCareer, deepFreeze } from "./career-builders";
import { FREE_AGENT_POOL_CAP, trimFreeAgents } from "./trim-free-agents";

/** Every attribute 10 and potential 10, so that age alone decides the value. */
const EQUAL_SKILL = {
  passing: 10,
  ballControl: 10,
  dribbling: 10,
  pace: 10,
  vision: 10,
  finishing: 10,
  workRate: 10,
  tackling: 10,
  positioning: 10,
  strength: 10,
  handling: 10,
  reflexes: 10,
  potential: 10,
};

/** Moves the first `ages.length` players of the first AI club to the pool, with these ages. */
const withPool = (ages: readonly number[]): Career => {
  const base = aCareer();
  const club = base.league.clubs.find((c) => c.id !== base.userClubId);
  if (!club) throw new Error("no AI club");
  const ids = club.playerIds.slice(0, ages.length);
  const ageOf = new Map(ids.map((id, i) => [id, ages[i] as number]));
  return deepFreeze({
    ...base,
    league: {
      ...base.league,
      clubs: base.league.clubs.map((c) =>
        c.id === club.id ? { ...c, playerIds: c.playerIds.filter((id) => !ageOf.has(id)) } : c,
      ),
      players: base.league.players.map((p) =>
        ageOf.has(p.id) ? { ...p, ...EQUAL_SKILL, age: ageOf.get(p.id) as number } : p,
      ),
    },
    freeAgentIds: ids,
    contracts: {
      ...base.contracts,
      ...Object.fromEntries(ids.map((id) => [id, { wage: 0, expiresSeason: base.season.number }])),
    },
  });
};

describe("trimFreeAgents", () => {
  it("caps the pool at 40 free agents", () => {
    expect(FREE_AGENT_POOL_CAP).toBe(40);
  });

  it("leaves a pool within the cap untouched", () => {
    const career = withPool([20, 25, 30]);
    expect(trimFreeAgents(career, 3)).toBe(career);
  });

  it("removes the lowest value players first, ties by id", () => {
    // Value falls with age, so the oldest are the least wanted; the two 33-year-olds tie.
    const career = withPool([20, 33, 24, 33, 28]);
    const [a, b, c, d, e] = career.freeAgentIds as [string, string, string, string, string];
    const next = trimFreeAgents(career, 3);
    const gone = [b, d].sort();
    expect(next.freeAgentIds).toEqual([a, c, e]);
    for (const id of gone) {
      expect(next.league.players.some((p) => p.id === id)).toBe(false);
      expect(next.contracts[id]).toBeUndefined();
      expect(next.condition[id]).toBeUndefined();
      expect(next.minutes[id]).toBeUndefined();
    }
  });

  it("removes the lower id first when values tie", () => {
    const career = withPool([33, 33, 20]);
    const [a, b, c] = career.freeAgentIds as [string, string, string];
    const keptOfTie = [a, b].sort()[1] as string;
    expect(trimFreeAgents(career, 2).freeAgentIds).toEqual(
      [a, b, c].filter((id) => id === keptOfTie || id === c),
    );
  });

  it("does not depend on the order of the pool", () => {
    const career = withPool([20, 33, 24, 33, 28]);
    const reversed = { ...career, freeAgentIds: [...career.freeAgentIds].reverse() };
    expect([...trimFreeAgents(reversed, 3).freeAgentIds].sort()).toEqual(
      [...trimFreeAgents(career, 3).freeAgentIds].sort(),
    );
  });

  it("never exceeds the cap whatever the size of the pool", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 16, max: 38 }), { minLength: 0, maxLength: 60 }),
        fc.integer({ min: 0, max: 45 }),
        (ages, cap) => {
          const next = trimFreeAgents(withPool(ages), cap);
          expect(next.freeAgentIds.length).toBe(Math.min(ages.length, cap));
        },
      ),
      { numRuns: 30 },
    );
  });
});
