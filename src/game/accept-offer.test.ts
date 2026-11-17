import { describe, expect, it } from "vitest";
import { acceptOffer } from "./accept-offer";
import { signingWage } from "./asking-price";
import { deepFreeze } from "./career-builders";
import { reassign } from "./transfer-core";
import type { TransferOffer } from "./transfer-offer";
import { aiClubOf, inWindow, sumOfBalances, userClubOf } from "./transfer-test-helpers";

const base = inWindow();
const buyer = aiClubOf(base);
const starter = base.squadPlan.starters[0] as string;
const offer: TransferOffer = { id: "o1", fromClubId: buyer.id, playerId: starter, fee: 5000 };
const other: TransferOffer = { ...offer, id: "o2", fromClubId: "x" };
const career = deepFreeze({ ...base, offers: [offer, other] });

describe("acceptOffer", () => {
  it("sells the player: fee to the user, contract at the new club, plan repaired", () => {
    const result = acceptOffer(career, offer);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const sold = result.career;
    expect(userClubOf(sold).playerIds).not.toContain(starter);
    expect(sold.league.clubs.find((c) => c.id === buyer.id)?.playerIds).toContain(starter);
    expect(sold.finances[career.userClubId]?.balance).toBe(
      (career.finances[career.userClubId]?.balance as number) + 5000,
    );
    expect(sold.finances[buyer.id]?.balance).toBe(
      (career.finances[buyer.id]?.balance as number) - 5000,
    );
    expect(sumOfBalances(sold)).toBe(sumOfBalances(career));
    expect(sold.contracts[starter]?.wage).toBe(signingWage(career, starter));
    expect(sold.squadPlan.starters).not.toContain(starter);
    expect(sold.squadPlan.starters).toHaveLength(11);
    expect(sold.squadPlan.formation).toBe(career.squadPlan.formation);
    expect(sold.squadPlan.tactics).toBe(career.squadPlan.tactics);
    expect(sold.offers).toEqual([]);
    expect(career.offers).toHaveLength(2);
  });

  it("refuses an offer that is not in Career.offers", () => {
    expect(acceptOffer(career, { ...offer, id: "nope" })).toEqual({
      ok: false,
      error: "unknown-offer",
    });
  });

  it("refuses with the window closed", () => {
    expect(acceptOffer({ ...career, window: "closed" }, offer)).toEqual({
      ok: false,
      error: "window-closed",
    });
  });

  it("refuses an offer from an unknown club and for a player the user no longer has", () => {
    expect(acceptOffer(career, other)).toEqual({ ok: false, error: "unknown-player" });
    const gone = reassign(career, starter);
    expect(acceptOffer(gone, offer)).toEqual({ ok: false, error: "unknown-player" });
  });

  it("refuses when the buying club cannot pay or has no room", () => {
    const broke = {
      ...career,
      finances: { ...career.finances, [buyer.id]: { balance: 0, baseIncome: 1_000_000_000 } },
    };
    expect(acceptOffer(broke, offer)).toEqual({ ok: false, error: "insufficient-funds" });
    const tight = {
      ...career,
      finances: { ...career.finances, [buyer.id]: { balance: 1_000_000, baseIncome: 0 } },
    };
    expect(acceptOffer(tight, offer)).toEqual({ ok: false, error: "over-wage-budget" });
    const filler = career.league.clubs.find((c) => c.id !== buyer.id && c.id !== career.userClubId);
    const full = (filler?.playerIds ?? [])
      .slice(0, 8)
      .reduce((c, id) => reassign(c, id, buyer.id), career);
    expect(acceptOffer(full, offer)).toEqual({ ok: false, error: "squad-full" });
  });

  it("refuses when the user's squad would fall below the minimums", () => {
    const extras = userClubOf(career)
      .playerIds.filter((id) => id !== starter)
      .slice(17);
    const lean = extras.reduce((c, id) => reassign(c, id), career);
    expect(userClubOf(lean).playerIds).toHaveLength(18);
    expect(acceptOffer(lean, offer)).toEqual({ ok: false, error: "seller-below-minimum" });
  });
});
