import { describe, expect, it } from "vitest";
import { releasePlayer } from "./release-player";
import { reassign } from "./transfer-core";
import { inWindow, sumOfBalances, userClubOf } from "./transfer-test-helpers";
import { wageBill } from "./wage-budget";

const career = inWindow();
const user = userClubOf(career);

describe("releasePlayer", () => {
  it("moves a bench player to the free agents with no fee and no further wage", () => {
    const id = career.squadPlan.bench[0] as string;
    const result = releasePlayer(career, id);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(userClubOf(result.career).playerIds).not.toContain(id);
    expect(result.career.freeAgentIds).toContain(id);
    expect(result.career.finances).toEqual(career.finances);
    expect(sumOfBalances(result.career)).toBe(sumOfBalances(career));
    expect(wageBill(result.career, career.userClubId)).toBeLessThan(
      wageBill(career, career.userClubId),
    );
    expect(user.playerIds).toContain(id);
  });

  it("repairs the squad plan when a starter leaves, keeping formation and tactics", () => {
    const id = career.squadPlan.starters[0] as string;
    const result = releasePlayer(career, id);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const plan = result.career.squadPlan;
    expect(plan.starters).not.toContain(id);
    expect(plan.bench).not.toContain(id);
    expect(plan.starters).toHaveLength(11);
    expect(plan.formation).toBe(career.squadPlan.formation);
    expect(plan.tactics).toBe(career.squadPlan.tactics);
  });

  it("leaves the plan alone when the player is not in it", () => {
    const planned = new Set([...career.squadPlan.starters, ...career.squadPlan.bench]);
    const id = user.playerIds.find((p) => !planned.has(p)) as string;
    const result = releasePlayer(career, id);
    expect(result.ok && result.career.squadPlan).toBe(career.squadPlan);
  });

  it("refuses a player who is not at the user's club", () => {
    expect(releasePlayer(career, "nobody")).toEqual({ ok: false, error: "unknown-player" });
  });

  it("refuses to go below 18 players", () => {
    const extras = user.playerIds.slice(18);
    const lean = extras.reduce((c, id) => reassign(c, id), career);
    const spare = lean.league.clubs.find((c) => c.id === career.userClubId)?.playerIds[0];
    expect(userClubOf(lean).playerIds).toHaveLength(18);
    expect(releasePlayer(lean, spare as string)).toEqual({
      ok: false,
      error: "seller-below-minimum",
    });
  });
});
