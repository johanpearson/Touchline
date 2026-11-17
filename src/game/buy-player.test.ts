import { describe, expect, it } from "vitest";
import { askingPrice, BEST_ELEVEN_PREMIUM, marketValue, signingWage } from "./asking-price";
import { buyPlayer } from "./buy-player";
import { deepFreeze } from "./career-builders";
import { reassign } from "./transfer-core";
import {
  aiClubOf,
  benchPlayerOf,
  inWindow,
  starPlayerOf,
  sumOfBalances,
  userClubOf,
} from "./transfer-test-helpers";

const career = inWindow();
const seller = aiClubOf(career);
const target = benchPlayerOf(career, seller.id);
const ask = askingPrice(career, target) as number;

const succeeded = (result: ReturnType<typeof buyPlayer>) => {
  if (!result.ok) throw new Error(result.error);
  return result.career;
};

describe("askingPrice", () => {
  it("is the value for a player outside the best eleven", () => {
    expect(ask).toBe(marketValue(career, target));
  });

  it("is 1.3 times the value, rounded up, for a player in the best eleven", () => {
    const star = starPlayerOf(career, seller.id);
    const value = marketValue(career, star) as number;
    expect(askingPrice(career, star)).toBe(Math.ceil(value * BEST_ELEVEN_PREMIUM));
  });

  it("is undefined for an unknown player", () => {
    expect(askingPrice(career, "nobody")).toBeUndefined();
  });
});

describe("buyPlayer", () => {
  it("moves the player, pays the fee between the two clubs and signs a contract at the ask", () => {
    const result = succeeded(buyPlayer(career, target, ask + 10, 4));
    expect(userClubOf(result).playerIds).toContain(target);
    expect(result.league.clubs.find((c) => c.id === seller.id)?.playerIds).not.toContain(target);
    expect(result.finances[career.userClubId]?.balance).toBe(
      (career.finances[career.userClubId]?.balance as number) - ask - 10,
    );
    expect(result.finances[seller.id]?.balance).toBe(
      (career.finances[seller.id]?.balance as number) + ask + 10,
    );
    expect(result.contracts[target]).toEqual({
      wage: signingWage(career, target),
      expiresSeason: career.season.number + 4,
    });
  });

  it("conserves the sum of all balances and leaves the input and the squad plan alone", () => {
    const result = succeeded(buyPlayer(career, target, ask));
    expect(sumOfBalances(result)).toBe(sumOfBalances(career));
    expect(result.squadPlan).toBe(career.squadPlan);
    expect(userClubOf(career).playerIds).not.toContain(target);
  });

  it("defaults to a contract of three seasons", () => {
    const result = succeeded(buyPlayer(career, target, ask));
    expect(result.contracts[target]?.expiresSeason).toBe(career.season.number + 3);
  });

  it("refuses with the window closed", () => {
    expect(buyPlayer({ ...career, window: "closed" }, target, ask)).toEqual({
      ok: false,
      error: "window-closed",
    });
  });

  it("refuses a fee below the asking price", () => {
    expect(buyPlayer(career, target, ask - 1)).toEqual({ ok: false, error: "fee-too-low" });
  });

  it.each([ask + 0.5, Number.NaN])("refuses the fee %s", (fee) => {
    expect(buyPlayer(career, target, fee)).toMatchObject({ ok: false });
  });

  it.each([0, 6, 2.5])("refuses a contract of %s seasons", (seasons) => {
    expect(buyPlayer(career, target, ask, seasons)).toEqual({ ok: false, error: "invalid-length" });
  });

  it("refuses when the balance does not cover the fee", () => {
    const poor = deepFreeze({
      ...career,
      finances: {
        ...career.finances,
        [career.userClubId]: { balance: ask - 1, baseIncome: 1_000_000_000 },
      },
    });
    expect(buyPlayer(poor, target, ask)).toEqual({ ok: false, error: "insufficient-funds" });
  });

  it("refuses when the wage bill would pass the wage budget", () => {
    const tight = deepFreeze({
      ...career,
      finances: {
        ...career.finances,
        [career.userClubId]: { balance: 1_000_000_000, baseIncome: 0 },
      },
    });
    expect(buyPlayer(tight, target, ask)).toEqual({ ok: false, error: "over-wage-budget" });
  });

  it("refuses when the squad is full", () => {
    const extra = seller.playerIds.filter((id) => id !== target).slice(0, 8);
    const full = extra.reduce((c, id) => reassign(c, id, career.userClubId), career);
    expect(userClubOf(full).playerIds).toHaveLength(30);
    expect(buyPlayer(full, target, ask)).toEqual({ ok: false, error: "squad-full" });
  });

  it("refuses when the seller would fall below a position minimum", () => {
    const keepers = seller.playerIds.filter(
      (id) => career.league.players.find((p) => p.id === id)?.position === "GK",
    );
    const thin = keepers.slice(2).reduce((c, id) => reassign(c, id), career);
    const keeper = keepers[0] as string;
    const price = askingPrice(thin, keeper) as number;
    expect(buyPlayer(thin, keeper, price)).toEqual({ ok: false, error: "seller-below-minimum" });
  });

  it("refuses when the seller would fall below 18 players", () => {
    const surplus = seller.playerIds.filter((id) => id !== target);
    const positions = ["GK", "DEF", "MID", "FWD"];
    const players = career.league.players;
    // Remove everybody the position minimums do not need, down to exactly 17 plus the target.
    const keep = new Set<string>([target]);
    for (const position of positions) {
      const need = { GK: 2, DEF: 5, MID: 5, FWD: 3 }[position] as number;
      const wanted = surplus
        .filter((id) => players.find((p) => p.id === id)?.position === position)
        .slice(0, need);
      for (const id of wanted) keep.add(id);
    }
    const extras = surplus.filter((id) => !keep.has(id));
    const lean = extras
      .slice(0, Math.max(0, seller.playerIds.length - 18))
      .reduce((c, id) => reassign(c, id), career);
    const size = lean.league.clubs.find((c) => c.id === seller.id)?.playerIds.length;
    expect(size).toBe(18);
    const price = askingPrice(lean, target) as number;
    expect(buyPlayer(lean, target, price)).toEqual({ ok: false, error: "seller-below-minimum" });
  });

  it("refuses an unknown player and a free agent", () => {
    expect(buyPlayer(career, "nobody", 1)).toEqual({ ok: false, error: "unknown-player" });
    const free = reassign(career, target);
    expect(buyPlayer(free, target, ask)).toEqual({ ok: false, error: "unknown-player" });
  });

  it("refuses to buy a player of the user's own club", () => {
    const own = userClubOf(career).playerIds[0] as string;
    expect(buyPlayer(career, own, 1_000_000)).toEqual({ ok: false, error: "own-player" });
  });
});
