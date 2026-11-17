import { describe, expect, it } from "vitest";
import { acceptOffer } from "./accept-offer";
import { marketValue } from "./asking-price";
import { aCareer, deepFreeze } from "./career-builders";
import { generateOffers, MAX_OFFERS } from "./generate-offers";
import { MIN_SQUAD_SIZE } from "./squad-limits";
import { staysWithinMinimums } from "./transfer-core";
import { inWindow, userClubOf } from "./transfer-test-helpers";

describe("generateOffers", () => {
  it("does not mutate its input and is deterministic", () => {
    const career = inWindow(1);
    expect(generateOffers(career)).toEqual(generateOffers(career));
  });

  it("makes between one and five offers", () => {
    const { offers } = generateOffers(inWindow(1));
    expect(offers.length).toBeGreaterThan(0);
    expect(offers.length).toBeLessThanOrEqual(MAX_OFFERS);
  });

  it("prices every offer between 0.8 and 1.2 times the player's value", () => {
    const career = inWindow(1);
    for (const offer of generateOffers(career).offers) {
      const value = marketValue(career, offer.playerId) as number;
      expect(offer.fee).toBeGreaterThanOrEqual(0.8 * value);
      expect(offer.fee).toBeLessThanOrEqual(1.2 * value);
    }
  });

  it("only offers for the user's players, one per player and one per club", () => {
    const career = inWindow(1);
    const { offers } = generateOffers(career);
    const mine = userClubOf(career).playerIds;
    for (const o of offers) expect(mine).toContain(o.playerId);
    expect(new Set(offers.map((o) => o.playerId)).size).toBe(offers.length);
    expect(new Set(offers.map((o) => o.fromClubId)).size).toBe(offers.length);
    expect(offers.every((o) => o.fromClubId !== career.userClubId)).toBe(true);
  });

  it("makes offers the user can accept, all at once", () => {
    const career = generateOffers(inWindow(2));
    let current = career;
    for (const offer of career.offers) {
      const result = acceptOffer(current, offer);
      expect(result.ok).toBe(true);
      if (result.ok) current = result.career;
    }
    expect(userClubOf(current).playerIds.length).toBeGreaterThanOrEqual(MIN_SQUAD_SIZE);
  });

  it("never offers for a player whose sale would break the squad minimums", () => {
    const career = inWindow(1);
    const user = userClubOf(career);
    const keepers = career.league.players.filter(
      (p) => user.playerIds.includes(p.id) && p.position === "GK",
    );
    const clubs = career.league.clubs.map((c) =>
      c.id === user.id
        ? {
            ...c,
            playerIds: c.playerIds.filter((id) => !keepers.slice(2).some((k) => k.id === id)),
          }
        : c,
    );
    const thin = deepFreeze({ ...career, league: { ...career.league, clubs } });
    for (const offer of generateOffers(thin).offers) {
      expect(staysWithinMinimums(thin, user.id, offer.playerId)).toBe(true);
    }
  });

  it("makes no offer a club cannot pay for", () => {
    const career = inWindow(1);
    const poor = {
      ...career,
      finances: Object.fromEntries(
        Object.entries(career.finances).map(([id]) => [id, { balance: 0, baseIncome: 0 }]),
      ),
    };
    expect(generateOffers(deepFreeze(poor)).offers).toEqual([]);
  });

  it("keeps existing offers: generated once for the window", () => {
    const first = generateOffers(inWindow(1));
    expect(generateOffers(first)).toBe(first);
  });

  it("does not depend on the order of the clubs", () => {
    const career = inWindow(3);
    const reversed = {
      ...career,
      league: { ...career.league, clubs: [...career.league.clubs].reverse() },
    };
    expect(generateOffers(reversed).offers).toEqual(generateOffers(career).offers);
  });

  it("changes with the seed", () => {
    expect(generateOffers(inWindow(1)).offers).not.toEqual(generateOffers(inWindow(4)).offers);
    expect(aCareer(1).offers).toEqual([]);
  });
});
