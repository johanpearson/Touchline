import { describe, expect, it } from "vitest";
import { signingWage } from "./asking-price";
import type { Career } from "./career";
import { deepFreeze } from "./career-builders";
import { signFreeAgent } from "./sign-free-agent";
import { reassign } from "./transfer-core";
import {
  aiClubOf,
  benchPlayerOf,
  inWindow,
  sumOfBalances,
  toFreeAgents,
  userClubOf,
} from "./transfer-test-helpers";

const open = inWindow();
const free = (() => {
  const id = benchPlayerOf(open, aiClubOf(open).id);
  return { career: deepFreeze(toFreeAgents(open, id)), id };
})();
const career = { ...free.career, window: "closed" as const };
const ask = signingWage(career, free.id) as number;

describe("signFreeAgent", () => {
  it("signs a free agent at any time without a fee", () => {
    const result = signFreeAgent(career, free.id, ask, 2);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(userClubOf(result.career).playerIds).toContain(free.id);
    expect(result.career.freeAgentIds).not.toContain(free.id);
    expect(result.career.contracts[free.id]).toEqual({
      wage: ask,
      expiresSeason: career.season.number + 2,
    });
    expect(sumOfBalances(result.career)).toBe(sumOfBalances(career));
    expect(result.career.finances).toEqual(career.finances);
    expect(userClubOf(career).playerIds).not.toContain(free.id);
  });

  it("refuses a wage below the ask", () => {
    expect(signFreeAgent(career, free.id, ask - 1)).toEqual({ ok: false, error: "wage-too-low" });
  });

  it("refuses a player who is not a free agent", () => {
    const signed = aiClubOf(career).playerIds[0] as string;
    expect(signFreeAgent(career, signed, 1_000_000)).toEqual({
      ok: false,
      error: "unknown-player",
    });
  });

  it.each([0, 6])("refuses a contract of %s seasons", (seasons) => {
    expect(signFreeAgent(career, free.id, ask, seasons)).toEqual({
      ok: false,
      error: "invalid-length",
    });
  });

  it("refuses when the wage bill would pass the wage budget", () => {
    const tight = {
      ...career,
      finances: { ...career.finances, [career.userClubId]: { balance: 0, baseIncome: 0 } },
    };
    expect(signFreeAgent(tight, free.id, ask)).toEqual({ ok: false, error: "over-wage-budget" });
  });

  it("refuses when the squad is full", () => {
    const extra = aiClubOf(career).playerIds.slice(0, 8);
    const full = extra.reduce<Career>((c, id) => reassign(c, id, career.userClubId), career);
    expect(signFreeAgent(full, free.id, ask)).toEqual({ ok: false, error: "squad-full" });
  });
});
