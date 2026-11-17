import { describe, expect, it } from "vitest";
import type { Career } from "./career";
import { aCareer, deepFreeze } from "./career-builders";
import { finishSeason, isSeasonFinished } from "./finish-season";
import { playMatchdays } from "./season-test-helpers";
import { summariseSeason } from "./summarise-season";
import { wageBill } from "./wage-budget";

const finished = (career: Career): Career => {
  const result = finishSeason(career);
  if (!result.ok) throw new Error(result.error);
  return result.career;
};

const completed = () => playMatchdays(aCareer(), 26);

const sorted = <T>(values: readonly T[]): T[] => [...values].sort();

describe("finishSeason", () => {
  it("returns a typed error for an unfinished season", () => {
    expect(finishSeason(playMatchdays(aCareer(), 10))).toEqual({
      ok: false,
      error: "season-incomplete",
    });
  });

  it("returns already-finished when it runs a second time", () => {
    const once = finished(completed());

    expect(isSeasonFinished(once)).toBe(true);
    expect(finishSeason(once)).toEqual({ ok: false, error: "already-finished" });
  });

  it("opens the window and keeps the season finished", () => {
    const old = completed();

    const career = finished(old);

    expect(career.window).toBe("open");
    expect(career.season).toEqual(old.season);
  });

  it("appends the season summary to the history, as summarised before anybody retired", () => {
    const old = completed();
    const expected = summariseSeason(old);
    if (!expected.ok) throw new Error(expected.error);

    expect(finished(old).history).toEqual([expected.summary]);
  });

  it("ages every remaining player by one year", () => {
    const old = completed();

    const career = finished(old);

    const before = new Map(old.league.players.map((p) => [p.id, p.age]));
    const stayers = career.league.players.filter((p) => before.has(p.id));
    expect(stayers.length).toBeGreaterThan(200);
    expect(stayers.every((p) => p.age === (before.get(p.id) as number) + 1)).toBe(true);
  });

  it("settles every club's finances with the wages of the season just played", () => {
    const old = completed();

    const career = finished(old);

    for (const club of old.league.clubs) {
      const before = old.finances[club.id]?.balance as number;
      const after = career.finances[club.id]?.balance as number;
      const finance = old.finances[club.id] as { baseIncome: number };
      const gain = after - before;
      expect(gain).toBeGreaterThan(finance.baseIncome - wageBill(old, club.id) - 1);
      expect(gain).toBeLessThan(finance.baseIncome - wageBill(old, club.id) + 3001);
    }
  });

  it("gives every club three youth players on contracts from the next season", () => {
    const career = finished(completed());

    for (const club of career.league.clubs) {
      const youth = club.playerIds.filter((id) => id.includes("-y1-"));
      expect(youth).toHaveLength(3);
    }
  });

  it("lets AI clubs release their unrenewed players but keeps the user's expiring players for renewal", () => {
    const old = completed();
    const expiringOf = (career: Career, clubId: string) =>
      (career.league.clubs.find((c) => c.id === clubId)?.playerIds ?? []).filter(
        (id) => (career.contracts[id]?.expiresSeason ?? Number.POSITIVE_INFINITY) <= 1,
      );
    const career = finished(old);

    expect(expiringOf(career, career.userClubId).length).toBeGreaterThan(0);
    const ai = career.league.clubs.filter((c) => c.id !== career.userClubId);
    for (const club of ai) {
      const unrenewedLeft = expiringOf(career, club.id).filter(
        (id) => !career.freeAgentIds.includes(id),
      );
      expect(unrenewedLeft).toEqual([]);
    }
    expect(career.freeAgentIds.length).toBeGreaterThan(0);
  });

  it("makes at most five offers for the user's players", () => {
    const career = finished(completed());

    expect(career.offers.length).toBeLessThanOrEqual(5);
    const mine = new Set(career.league.clubs.find((c) => c.id === career.userClubId)?.playerIds);
    expect(career.offers.every((offer) => mine.has(offer.playerId))).toBe(true);
  });

  it("does not change its input and stays JSON round-trippable", () => {
    const old = deepFreeze(playMatchdays(aCareer(), 26));

    const career = finished(old);

    expect(JSON.parse(JSON.stringify(career))).toEqual(career);
  });

  it("gives the same result for the same career", () => {
    const old = completed();

    expect(finished(old)).toEqual(finished(old));
  });

  it("does not depend on the order of the clubs in the league", () => {
    const old = completed();
    const reversed: Career = {
      ...old,
      league: { ...old.league, clubs: [...old.league.clubs].reverse() },
    };

    const a = finished(old);
    const b = finished(reversed);

    for (const club of a.league.clubs) {
      const other = b.league.clubs.find((c) => c.id === club.id);
      expect(sorted(other?.playerIds ?? [])).toEqual(sorted(club.playerIds));
      expect(b.finances[club.id]).toEqual(a.finances[club.id]);
    }
    expect(sorted(b.freeAgentIds)).toEqual(sorted(a.freeAgentIds));
    const byId = (career: Career) =>
      Object.fromEntries(career.league.players.map((p) => [p.id, p]));
    expect(byId(b)).toEqual(byId(a));
    expect(b.offers).toEqual(a.offers);
  });
});
