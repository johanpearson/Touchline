import { describe, expect, it } from "vitest";
import { allAiExpiring } from "./ai-offseason-test-helpers";
import { buildAiSquads } from "./build-ai-squads";
import type { Career } from "./career";
import { aCareer, deepFreeze } from "./career-builders";
import { renewAiContracts } from "./renew-ai-contracts";
import { MAX_SQUAD_SIZE, squadLimits } from "./squad-limits";
import { reassign } from "./transfer-core";
import { aiClubOf, userClubOf } from "./transfer-test-helpers";
import { wageBill, wageBudget } from "./wage-budget";

const offseason = (career: Career): Career => buildAiSquads(renewAiContracts(career));

describe("buildAiSquads", () => {
  it("returns an equal career and does not mutate its input", () => {
    const career = deepFreeze(aCareer(1));
    expect(buildAiSquads(career)).toEqual(career);
  });

  it("is deterministic", () => {
    const career = allAiExpiring();
    expect(offseason(career)).toEqual(offseason(career));
  });

  it("leaves every AI club legal and within its wage budget", () => {
    const next = offseason(allAiExpiring());
    for (const club of next.league.clubs.filter((c) => c.id !== next.userClubId)) {
      expect(squadLimits(next, club.id).ok).toBe(true);
      const finance = next.finances[club.id] as { baseIncome: number };
      expect(wageBill(next, club.id)).toBeLessThanOrEqual(wageBudget(finance));
    }
  });

  it("fills a missing position minimum with a free agent of that position", () => {
    const base = aCareer(1);
    const club = aiClubOf(base);
    const keepers = base.league.players.filter(
      (p) => club.playerIds.includes(p.id) && p.position === "GK",
    );
    const freed = keepers.slice(1).reduce((c, p) => reassign(c, p.id), base);
    const pool = freed.freeAgentIds;
    const next = buildAiSquads(deepFreeze(freed));
    const signed = next.league.clubs
      .find((c) => c.id === club.id)
      ?.playerIds.filter((id) => pool.includes(id));
    expect(signed?.length).toBeGreaterThanOrEqual(1);
    expect(squadLimits(next, club.id).missing.GK).toBeUndefined();
  });

  it("signs a free agent with at most one club and shrinks the pool", () => {
    const base = aCareer(1);
    const thinned = base.league.clubs
      .filter((c) => c.id !== base.userClubId)
      .slice(0, 3)
      .flatMap((c) => c.playerIds.slice(0, 8))
      .reduce((c, id) => reassign(c, id), base);
    const next = buildAiSquads(deepFreeze(thinned));
    const all = next.league.clubs.flatMap((c) => c.playerIds).concat(next.freeAgentIds);
    expect(new Set(all).size).toBe(all.length);
    expect(next.freeAgentIds.length).toBeLessThan(thinned.freeAgentIds.length);
  });

  it("signs the cheapest legal free agents for an insolvent club", () => {
    const career = allAiExpiring();
    const club = aiClubOf(career);
    const broke = {
      ...career,
      finances: { ...career.finances, [club.id]: { balance: -5000, baseIncome: 0 } },
    };
    const next = offseason(deepFreeze(broke));
    expect(squadLimits(next, club.id).ok).toBe(true);
    expect(next.finances[club.id]?.balance).toBe(-5000);
  });

  it("releases the lowest-value players of a club above 30", () => {
    const base = aCareer(1);
    const club = aiClubOf(base);
    const others = base.league.clubs
      .filter((c) => c.id !== club.id && c.id !== base.userClubId)
      .flatMap((c) => c.playerIds)
      .slice(0, 12);
    const clubs = base.league.clubs.map((c) =>
      c.id === club.id
        ? { ...c, playerIds: [...c.playerIds, ...others] }
        : { ...c, playerIds: c.playerIds.filter((id) => !others.includes(id)) },
    );
    const bloated = { ...base, league: { ...base.league, clubs } };
    const next = buildAiSquads(deepFreeze(bloated));
    expect(next.league.clubs.find((c) => c.id === club.id)?.playerIds).toHaveLength(MAX_SQUAD_SIZE);
    expect(squadLimits(next, club.id).ok).toBe(true);
  });

  it("does not touch the user's club", () => {
    const career = allAiExpiring();
    const next = offseason(career);
    expect(userClubOf(next).playerIds).toEqual(userClubOf(career).playerIds);
  });

  it("does not depend on the order of the clubs", () => {
    const career = allAiExpiring(3);
    const reversed = {
      ...career,
      league: { ...career.league, clubs: [...career.league.clubs].reverse() },
    };
    const a = offseason(career);
    const b = offseason(reversed);
    expect(b.contracts).toEqual(a.contracts);
    for (const club of a.league.clubs) {
      const same = b.league.clubs.find((c) => c.id === club.id);
      expect([...(same?.playerIds ?? [])].sort()).toEqual([...club.playerIds].sort());
    }
  });
});
