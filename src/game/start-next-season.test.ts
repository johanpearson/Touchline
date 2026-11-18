import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { acceptOffer } from "./accept-offer";
import { autoManageUserSquad } from "./auto-manage-squad";
import type { Career } from "./career";
import { aCareer, deepFreeze } from "./career-builders";
import { finishSeason } from "./finish-season";
import { playMatchdays, playSeasons, rolledOver } from "./season-test-helpers";
import { squadLimits } from "./squad-limits";
import { startNextSeason } from "./start-next-season";
import { FREE_AGENT_POOL_CAP } from "./trim-free-agents";

const finished = (career: Career): Career => {
  const result = finishSeason(career);
  if (!result.ok) throw new Error(result.error);
  return result.career;
};

const next = (career: Career): Career => {
  const result = startNextSeason(career);
  if (!result.ok) throw new Error(result.error);
  return result.career;
};

const offSeason = () => finished(playMatchdays(aCareer(), 26));

describe("startNextSeason", () => {
  it("returns season-incomplete for an unfinished season", () => {
    expect(startNextSeason(playMatchdays(aCareer(), 10))).toEqual({
      ok: false,
      error: "season-incomplete",
    });
  });

  it("returns window-not-open for a completed season whose off-season has not begun", () => {
    expect(startNextSeason(playMatchdays(aCareer(), 26))).toEqual({
      ok: false,
      error: "window-not-open",
    });
  });

  it("returns squad-over-limit when the user's squad is above 30 players", () => {
    const career = offSeason();
    const taken = career.league.clubs
      .filter((c) => c.id !== career.userClubId)
      .flatMap((c) => c.playerIds)
      .slice(0, 12);
    const crowded: Career = {
      ...career,
      league: {
        ...career.league,
        clubs: career.league.clubs.map((c) =>
          c.id === career.userClubId
            ? { ...c, playerIds: [...c.playerIds, ...taken] }
            : { ...c, playerIds: c.playerIds.filter((id) => !taken.includes(id)) },
        ),
      },
    };

    expect(squadLimits(crowded, crowded.userClubId).excessTotal).toBeGreaterThan(0);
    expect(startNextSeason(crowded)).toEqual({ ok: false, error: "squad-over-limit" });
  });

  it("returns squad-over-limit when ending contracts would leave the user's squad too small", () => {
    const career = offSeason();
    const user = career.league.clubs.find((c) => c.id === career.userClubId);
    const all = { ...career.contracts };
    for (const id of user?.playerIds ?? []) all[id] = { wage: 0, expiresSeason: 1 };

    const result = startNextSeason({ ...career, contracts: all });

    expect(result).toEqual({ ok: false, error: "squad-over-limit" });
  });

  it("starts season n+1 with a fresh fixture list, no results and the first matchday", () => {
    const old = offSeason();

    const career = next(old);

    expect(career.season.number).toBe(2);
    expect(career.season.results).toEqual([]);
    expect(career.season.currentMatchday).toBe(1);
    expect(career.season.fixtures).toHaveLength(old.season.fixtures.length);
    expect(career.season.fixtures).not.toEqual(old.season.fixtures);
  });

  it("closes the window, clears the offers and resets minutes, fitness and form", () => {
    const old = offSeason();

    const career = next(old);

    expect(career.window).toBe("closed");
    expect(career.offers).toEqual([]);
    expect(Object.values(career.minutes).every((m) => m === 0)).toBe(true);
    expect(new Set(Object.keys(career.minutes))).toEqual(
      new Set(career.league.players.map((p) => p.id)),
    );
    expect(Object.values(career.condition).every((c) => c.fitness === 100 && c.form === 5)).toBe(
      true,
    );
  });

  it("lets the user's unrenewed players go to the free agents and keeps the renewed ones", () => {
    const old = offSeason();
    const mine = old.league.clubs.find((c) => c.id === old.userClubId)?.playerIds ?? [];
    const expiring = mine.filter((id) => (old.contracts[id]?.expiresSeason ?? 99) <= 1);
    expect(expiring.length).toBeGreaterThan(1);

    const career = next(old);

    const kept = career.league.clubs.find((c) => c.id === career.userClubId)?.playerIds ?? [];
    expect(expiring.every((id) => !kept.includes(id) && career.freeAgentIds.includes(id))).toBe(
      true,
    );
  });

  it("re-picks the user's lineup when a starter is no longer in the squad", () => {
    const career = autoManageUserSquad(offSeason());
    const user = career.league.clubs.find((c) => c.id === career.userClubId);
    const without = (gone: string): Career => ({
      ...career,
      league: {
        ...career.league,
        clubs: career.league.clubs.map((c) =>
          c === user ? { ...c, playerIds: c.playerIds.filter((id) => id !== gone) } : c,
        ),
      },
      freeAgentIds: [...career.freeAgentIds, gone],
    });
    const gone = career.squadPlan.starters.find((id) => startNextSeason(without(id)).ok);
    if (!gone) throw new Error("expected a starter the squad can spare");
    const stale = without(gone);

    const started = next(stale);

    const mine = started.league.clubs.find((c) => c.id === started.userClubId)?.playerIds ?? [];
    expect(started.squadPlan.starters).not.toContain(gone);
    expect(started.squadPlan.starters.every((id) => mine.includes(id))).toBe(true);
    expect(started.squadPlan.bench.every((id) => mine.includes(id))).toBe(true);
  });

  it("leaves every AI club with a legal squad", () => {
    const career = next(offSeason());

    for (const club of career.league.clubs) {
      expect(squadLimits(career, club.id).ok).toBe(true);
    }
  });

  it("does not change its input and stays JSON round-trippable", () => {
    const old = deepFreeze(offSeason());

    const career = next(old);

    expect(JSON.parse(JSON.stringify(career))).toEqual(career);
  });

  it("is deterministic", () => {
    const old = offSeason();

    expect(next(old)).toEqual(next(old));
  });

  it("applies an accepted offer before the next season starts", () => {
    const old = offSeason();
    const offer = old.offers[0];
    if (!offer) throw new Error("expected an offer");
    const sold = acceptOffer(old, offer);
    if (!sold.ok) throw new Error(sold.error);

    const career = next(sold.career);

    const mine = career.league.clubs.find((c) => c.id === career.userClubId)?.playerIds ?? [];
    expect(mine).not.toContain(offer.playerId);
  });

  it("keeps three consecutive seasons in the history, each with every club at 26 played", () => {
    const career = playSeasons(aCareer(), 3);

    expect(career.season.number).toBe(3);
    const done = next(finished(career));
    expect(done.history.map((h) => h.seasonNumber)).toEqual([1, 2, 3]);
    for (const summary of done.history) {
      expect(summary.finalTable.every((row) => row.played === 26)).toBe(true);
    }
  });

  it("rolls a career over in one step with the test helper", () => {
    expect(rolledOver(playMatchdays(aCareer(), 26)).season.number).toBe(2);
  });

  it("never leaves more than the cap of free agents, whatever the pool was", () => {
    const old = offSeason();
    const aiPlayers = old.league.clubs
      .filter((c) => c.id !== old.userClubId)
      .flatMap((c) => c.playerIds);
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 70 }), (extra) => {
        const moved = new Set(aiPlayers.slice(0, extra));
        const crowded: Career = {
          ...old,
          league: {
            ...old.league,
            clubs: old.league.clubs.map((c) => ({
              ...c,
              playerIds: c.playerIds.filter((id) => !moved.has(id)),
            })),
          },
          freeAgentIds: [...old.freeAgentIds, ...moved],
        };

        const career = next(crowded);

        expect(career.freeAgentIds.length).toBeLessThanOrEqual(FREE_AGENT_POOL_CAP);
        const all = career.league.clubs.flatMap((c) => c.playerIds).concat(career.freeAgentIds);
        expect(new Set(all).size).toBe(all.length);
        expect(new Set(all)).toEqual(new Set(career.league.players.map((p) => p.id)));
      }),
      { numRuns: 8 },
    );
  });
});
