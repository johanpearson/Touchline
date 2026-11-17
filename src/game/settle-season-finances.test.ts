import { describe, expect, it } from "vitest";
import type { Career } from "./career";
import { aCareer, deepFreeze } from "./career-builders";
import type { Result } from "./compute-table";
import {
  PRIZE_FIRST_PLACE,
  PRIZE_LAST_PLACE,
  prizeFor,
  settleSeasonFinances,
} from "./settle-season-finances";
import { wageBill } from "./wage-budget";

const win = (id: string, home: string, away: string): Result => ({
  fixtureId: id,
  homeClubId: home,
  awayClubId: away,
  homeGoals: 1,
  awayGoals: 0,
  engineVersion: 2,
});

/** A four-club league where club i beats every club below it: final order is a, b, c, d. */
const smallLeague = (): { career: Career; ids: string[] } => {
  const base = aCareer(2);
  const clubs = base.league.clubs.slice(0, 4);
  const ids = clubs.map((c) => c.id);
  const [a, b, c, d] = ids as [string, string, string, string];
  const results = [
    win("1", a, b),
    win("2", a, c),
    win("3", a, d),
    win("4", b, c),
    win("5", b, d),
    win("6", c, d),
  ];
  const career = deepFreeze({
    ...base,
    league: { ...base.league, clubs },
    season: { ...base.season, results },
    finances: Object.fromEntries(ids.map((id) => [id, { balance: 100, baseIncome: 5000 }])),
  });
  return { career, ids };
};

describe("prizeFor", () => {
  it("falls linearly from first to last place", () => {
    expect(prizeFor(1, 4)).toBe(PRIZE_FIRST_PLACE);
    expect(prizeFor(4, 4)).toBe(PRIZE_LAST_PLACE);
    expect(prizeFor(2, 4)).toBe(2100);
    expect(prizeFor(3, 4)).toBe(1200);
  });

  it("gives the first-place prize to a one-club league", () => {
    expect(prizeFor(1, 1)).toBe(PRIZE_FIRST_PLACE);
  });
});

describe("settleSeasonFinances", () => {
  it("adds base income and the prize for the final position and subtracts the wage bill", () => {
    const { career, ids } = smallLeague();
    const settled = settleSeasonFinances(career);
    ids.forEach((id, i) => {
      const prize = [3000, 2100, 1200, 300][i] as number;
      expect(settled.finances[id]?.balance).toBe(100 + 5000 + prize - wageBill(career, id));
    });
  });

  it("keeps base income and does not mutate the input", () => {
    const { career, ids } = smallLeague();
    const settled = settleSeasonFinances(career);
    expect(settled.finances[ids[0] as string]?.baseIncome).toBe(5000);
    expect(career.finances[ids[0] as string]?.balance).toBe(100);
  });

  it("lets a balance go negative", () => {
    const { career, ids } = smallLeague();
    const poor = {
      ...career,
      finances: { ...career.finances, [ids[3] as string]: { balance: -50000, baseIncome: 1 } },
    };
    expect(settleSeasonFinances(poor).finances[ids[3] as string]?.balance as number).toBeLessThan(
      -50000,
    );
  });
});
