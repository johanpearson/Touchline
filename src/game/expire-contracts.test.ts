import { describe, expect, it } from "vitest";
import { aCareer, deepFreeze } from "./career-builders";
import { expireContracts } from "./expire-contracts";

const base = aCareer(4);
const user = base.league.clubs.find((c) => c.id === base.userClubId) as {
  id: string;
  playerIds: string[];
};
const other = base.league.clubs.find((c) => c.id !== base.userClubId) as {
  id: string;
  playerIds: string[];
};

const withContracts = (expiring: string[]) =>
  deepFreeze({
    ...base,
    contracts: Object.fromEntries(
      Object.entries(base.contracts).map(([id, c]) => [
        id,
        {
          ...c,
          expiresSeason: expiring.includes(id) ? base.season.number : base.season.number + 2,
        },
      ]),
    ),
  });

describe("expireContracts", () => {
  it("moves only expiring players to the free agents and keeps their records", () => {
    const leaver = other.playerIds[0] as string;
    const result = expireContracts(withContracts([leaver]));
    expect(result.freeAgentIds).toEqual([leaver]);
    expect(result.league.clubs.find((c) => c.id === other.id)?.playerIds).not.toContain(leaver);
    expect(result.league.clubs.find((c) => c.id === other.id)?.playerIds).toHaveLength(
      other.playerIds.length - 1,
    );
    expect(result.league.players).toBe(base.league.players);
    expect(result.contracts[leaver]).toBeDefined();
  });

  it("never touches contracts that run longer", () => {
    const career = withContracts([]);
    expect(expireContracts(career)).toBe(career);
  });

  it("repairs the squad plan when a starter or substitute left, keeping formation and tactics", () => {
    const starter = base.squadPlan.starters[3] as string;
    const result = expireContracts(withContracts([starter]));
    const plan = result.squadPlan;
    expect([...plan.starters, ...plan.bench]).not.toContain(starter);
    expect(plan.starters).toHaveLength(11);
    expect(plan.formation).toBe(base.squadPlan.formation);
    expect(plan.tactics).toEqual(base.squadPlan.tactics);
    for (const id of [...plan.starters, ...plan.bench])
      expect(result.league.clubs.find((c) => c.id === user.id)?.playerIds).toContain(id);
  });

  it("keeps the plan when only a player outside it left", () => {
    const planned = new Set([...base.squadPlan.starters, ...base.squadPlan.bench]);
    const spare = user.playerIds.find((id) => !planned.has(id)) as string;
    expect(expireContracts(withContracts([spare])).squadPlan).toBe(base.squadPlan);
  });
});
