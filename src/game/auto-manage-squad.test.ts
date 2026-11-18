import { describe, expect, it } from "vitest";
import { autoManageUserSquad } from "./auto-manage-squad";
import type { Career } from "./career";
import { aCareer, deepFreeze } from "./career-builders";
import { finishSeason } from "./finish-season";
import { playMatchdays } from "./season-test-helpers";
import { MAX_SQUAD_SIZE, squadLimits } from "./squad-limits";
import { startNextSeason } from "./start-next-season";

const offSeason = (): Career => {
  const result = finishSeason(playMatchdays(aCareer(), 26));
  if (!result.ok) throw new Error(result.error);
  return result.career;
};

const withUserSquad = (career: Career, change: (ids: string[]) => string[]): Career => ({
  ...career,
  league: {
    ...career.league,
    clubs: career.league.clubs.map((c) =>
      c.id === career.userClubId ? { ...c, playerIds: change(c.playerIds) } : c,
    ),
  },
});

const userIds = (career: Career): string[] =>
  career.league.clubs.find((c) => c.id === career.userClubId)?.playerIds ?? [];

describe("autoManageUserSquad", () => {
  it("renews the contracts the wage budget allows, so most expiring players stay", () => {
    const old = offSeason();
    const expiring = userIds(old).filter((id) => (old.contracts[id]?.expiresSeason ?? 99) <= 1);
    expect(expiring.length).toBeGreaterThan(1);

    const career = autoManageUserSquad(old);

    const kept = expiring.filter((id) => userIds(career).includes(id));
    expect(kept.length).toBeGreaterThan(0);
    for (const id of kept) expect(career.contracts[id]?.expiresSeason).toBeGreaterThan(1);
  });

  it("lets the next season start", () => {
    expect(startNextSeason(autoManageUserSquad(offSeason())).ok).toBe(true);
  });

  it("releases the surplus above 30 players", () => {
    const old = offSeason();
    const taken = old.league.clubs
      .filter((c) => c.id !== old.userClubId)
      .flatMap((c) => c.playerIds)
      .slice(0, 12);
    const joined = withUserSquad(old, (ids) => [...ids, ...taken]);
    const crowded: Career = {
      ...joined,
      league: {
        ...joined.league,
        clubs: joined.league.clubs.map((c) =>
          c.id === old.userClubId
            ? c
            : { ...c, playerIds: c.playerIds.filter((id) => !taken.includes(id)) },
        ),
      },
    };
    expect(userIds(crowded).length).toBeGreaterThan(MAX_SQUAD_SIZE);

    const career = autoManageUserSquad(crowded);

    expect(squadLimits(career, career.userClubId).ok).toBe(true);
    expect(career.freeAgentIds.length).toBeGreaterThan(crowded.freeAgentIds.length);
  });

  it("signs free agents until a squad short of players is legal again", () => {
    const old = offSeason();
    const thin = withUserSquad(old, (ids) => ids.slice(0, 14));
    const thinned: Career = {
      ...thin,
      freeAgentIds: [...thin.freeAgentIds, ...userIds(old).slice(14)],
    };
    expect(squadLimits(thinned, thinned.userClubId).ok).toBe(false);

    const career = autoManageUserSquad(thinned);

    expect(squadLimits(career, career.userClubId).ok).toBe(true);
    expect(userIds(career).length).toBeGreaterThanOrEqual(18);
  });

  it("keeps the lineup inside the squad", () => {
    const career = autoManageUserSquad(offSeason());

    const mine = userIds(career);
    for (const id of [...career.squadPlan.starters, ...career.squadPlan.bench]) {
      expect(mine).toContain(id);
    }
  });

  it("does not touch the AI clubs and does not change its input", () => {
    const old = deepFreeze(offSeason());

    const career = autoManageUserSquad(old);

    for (const club of old.league.clubs.filter((c) => c.id !== old.userClubId)) {
      const after = career.league.clubs.find((c) => c.id === club.id);
      expect(after?.playerIds).toEqual(club.playerIds);
    }
  });

  it("is deterministic", () => {
    const old = offSeason();

    expect(autoManageUserSquad(old)).toEqual(autoManageUserSquad(old));
  });
});
