import { describe, expect, it } from "vitest";
import { allAiExpiring } from "./ai-offseason-test-helpers";
import { aCareer, deepFreeze } from "./career-builders";
import { playerOverall } from "./player-overall";
import { AI_RENEW_BEST_COUNT, AI_RENEW_MAX_AGE, renewAiContracts } from "./renew-ai-contracts";
import { aiClubOf, userClubOf } from "./transfer-test-helpers";
import { wageBill, wageBudget } from "./wage-budget";

const idsOf = (career: ReturnType<typeof aCareer>, clubId: string) =>
  career.league.clubs.find((c) => c.id === clubId)?.playerIds ?? [];

describe("renewAiContracts", () => {
  it("does not mutate its input", () => {
    expect(() => renewAiContracts(allAiExpiring())).not.toThrow();
  });

  it("is deterministic", () => {
    const career = allAiExpiring();
    expect(renewAiContracts(career)).toEqual(renewAiContracts(career));
  });

  it("keeps the best 18 and the young, within the wage budget", () => {
    const career = allAiExpiring();
    const club = aiClubOf(career);
    const next = renewAiContracts(career);
    const squad = career.league.players.filter((p) => club.playerIds.includes(p.id));
    const best = [...squad]
      .sort((a, b) => playerOverall(b) - playerOverall(a) || (a.id < b.id ? -1 : 1))
      .slice(0, AI_RENEW_BEST_COUNT);
    const kept = idsOf(next, club.id);
    for (const p of squad) {
      const wanted = best.includes(p) || p.age <= AI_RENEW_MAX_AGE;
      if (!wanted) expect(kept).not.toContain(p.id);
    }
    expect(wageBill(next, club.id)).toBeLessThanOrEqual(
      wageBudget(next.finances[club.id] as { baseIncome: number }),
    );
  });

  it("gives renewed players a contract that runs past the current season", () => {
    const next = renewAiContracts(allAiExpiring());
    const club = aiClubOf(next);
    for (const id of idsOf(next, club.id)) {
      const contract = next.contracts[id];
      expect(contract?.expiresSeason).toBeGreaterThan(next.season.number);
      expect(contract?.expiresSeason).toBeLessThanOrEqual(next.season.number + 5);
    }
  });

  it("releases the players it does not keep into the free agents, once each", () => {
    const career = allAiExpiring();
    const next = renewAiContracts(career);
    const total = (c: typeof career) =>
      c.league.clubs.flatMap((x) => x.playerIds).length + c.freeAgentIds.length;
    expect(total(next)).toBe(total(career));
    expect(new Set(next.freeAgentIds).size).toBe(next.freeAgentIds.length);
    for (const id of next.freeAgentIds)
      expect(next.contracts[id]?.expiresSeason).toBe(next.season.number);
  });

  it("leaves the user's club and players with longer contracts alone", () => {
    const base = aCareer(2);
    const long = Object.fromEntries(
      Object.entries(base.contracts).map(([id, c]) => [id, { ...c, expiresSeason: 9 }]),
    );
    const career = deepFreeze({ ...base, contracts: long });
    const next = renewAiContracts(career);
    expect(idsOf(next, userClubOf(career).id)).toEqual(userClubOf(career).playerIds);
    expect(next.freeAgentIds).toEqual(career.freeAgentIds);
  });

  it("does not depend on the order of the clubs", () => {
    const career = allAiExpiring(3);
    const reversed = {
      ...career,
      league: { ...career.league, clubs: [...career.league.clubs].reverse() },
    };
    const a = renewAiContracts(career);
    const b = renewAiContracts(reversed);
    expect(b.contracts).toEqual(a.contracts);
    expect([...b.freeAgentIds].sort()).toEqual([...a.freeAgentIds].sort());
  });

  it("renews nobody when the wage budget is zero", () => {
    const career = allAiExpiring();
    const club = aiClubOf(career);
    const poor = {
      ...career,
      finances: { ...career.finances, [club.id]: { balance: 0, baseIncome: 0 } },
    };
    expect(idsOf(renewAiContracts(poor), club.id)).toEqual([]);
  });
});
