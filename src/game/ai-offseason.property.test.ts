import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { allAiExpiring } from "./ai-offseason-test-helpers";
import { buildAiSquads } from "./build-ai-squads";
import { renewAiContracts } from "./renew-ai-contracts";
import { squadLimits } from "./squad-limits";
import { wageBill, wageBudget } from "./wage-budget";

describe("AI off-season squads over seeds", () => {
  it("leave every AI club with a legal squad inside its wage budget, and each player once", () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 6 }), (seed) => {
        const next = buildAiSquads(renewAiContracts(allAiExpiring(seed)));
        const all = next.league.clubs.flatMap((c) => c.playerIds).concat(next.freeAgentIds);
        expect(new Set(all).size).toBe(all.length);
        for (const club of next.league.clubs.filter((c) => c.id !== next.userClubId)) {
          expect(squadLimits(next, club.id).ok).toBe(true);
          const finance = next.finances[club.id] as { baseIncome: number };
          expect(wageBill(next, club.id)).toBeLessThanOrEqual(wageBudget(finance));
        }
      }),
      { numRuns: 6 },
    );
  });
});
