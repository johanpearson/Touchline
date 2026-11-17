import { describe, expect, it } from "vitest";
import type { Career } from "./career";
import { aCareer, deepFreeze } from "./career-builders";
import { developPlayers } from "./develop-players";
import { parseCareer } from "./parse-career";
import { playerOverall } from "./player-overall";
import { retirePlayers } from "./retire-players";
import { MAX_SQUAD_SIZE, MIN_PER_POSITION, squadLimits } from "./squad-limits";
import type { PlayerPosition } from "./squad-player";
import { generateYouthIntake, YOUTH_CONTRACT_SEASONS, YOUTH_PER_CLUB } from "./youth-intake";

const base = aCareer(8);
const POSITIONS = Object.keys(MIN_PER_POSITION) as PlayerPosition[];

const youthOf = (before: Career, after: Career, clubId: string) => {
  const known = new Set(before.league.players.map((p) => p.id));
  const club = after.league.clubs.find((c) => c.id === clubId);
  return after.league.players.filter((p) => !known.has(p.id) && club?.playerIds.includes(p.id));
};

/** The career with the given players of `clubId` removed from the club and the league. */
const withoutPlayers = (
  career: Career,
  clubId: string,
  remove: (p: { position: string }) => boolean,
) => {
  const gone = new Set(
    career.league.players
      .filter(
        (p) =>
          career.league.clubs.find((c) => c.id === clubId)?.playerIds.includes(p.id) && remove(p),
      )
      .map((p) => p.id),
  );
  return {
    ...career,
    league: {
      ...career.league,
      clubs: career.league.clubs.map((c) =>
        c.id === clubId ? { ...c, playerIds: c.playerIds.filter((id) => !gone.has(id)) } : c,
      ),
      players: career.league.players.filter((p) => !gone.has(p.id)),
    },
    squadPlan: career.squadPlan,
  };
};

describe("generateYouthIntake", () => {
  const after = generateYouthIntake(deepFreeze(base));

  it("gives every club exactly three new players with unique ids", () => {
    for (const club of base.league.clubs) {
      expect(youthOf(base, after, club.id)).toHaveLength(YOUTH_PER_CLUB);
    }
    const ids = after.league.players.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(after.league.clubs.every((c) => c.playerIds.length === 25)).toBe(true);
  });

  it("gives unique names inside each club", () => {
    for (const club of after.league.clubs) {
      const names = after.league.players
        .filter((p) => club.playerIds.includes(p.id))
        .map((p) => p.name);
      expect(new Set(names).size).toBe(names.length);
    }
  });

  it("makes players aged 16 to 18 whose potential is at least their overall", () => {
    for (const club of base.league.clubs) {
      for (const p of youthOf(base, after, club.id)) {
        expect(p.age).toBeGreaterThanOrEqual(16);
        expect(p.age).toBeLessThanOrEqual(18);
        expect(p.potential).toBeGreaterThanOrEqual(playerOverall(p));
        expect(p.potential).toBeLessThanOrEqual(20);
      }
    }
  });

  it("makes youth weaker than the first-team average on average", () => {
    const youth = base.league.clubs.flatMap((c) => youthOf(base, after, c.id));
    const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
    expect(mean(youth.map(playerOverall))).toBeLessThan(
      mean(base.league.players.map(playerOverall)),
    );
  });

  it("lets stronger clubs produce better youth on average", () => {
    const quality = (clubId: string) => {
      const youth = youthOf(base, after, clubId);
      return youth.reduce((s, p) => s + playerOverall(p), 0) / youth.length;
    };
    const strength = (clubId: string) => {
      const squad = base.league.players.filter((p) =>
        base.league.clubs.find((c) => c.id === clubId)?.playerIds.includes(p.id),
      );
      return squad.reduce((s, p) => s + playerOverall(p), 0) / squad.length;
    };
    const ranked = [...base.league.clubs].sort((a, b) => strength(a.id) - strength(b.id));
    const half = ranked.length / 2;
    const mean = (clubs: typeof ranked) =>
      clubs.reduce((s, c) => s + quality(c.id), 0) / clubs.length;
    expect(mean(ranked.slice(half))).toBeGreaterThan(mean(ranked.slice(0, half)));
  });

  it("gives a contract of three seasons from the next season, without touching finances", () => {
    const p = youthOf(base, after, base.league.clubs[0]?.id as string)[0];
    const contract = after.contracts[p?.id as string];
    expect(contract?.expiresSeason).toBe(base.season.number + YOUTH_CONTRACT_SEASONS);
    expect(contract?.wage).toBeGreaterThanOrEqual(0);
    expect(after.finances).toBe(base.finances);
  });

  it("adds condition and minutes for the new players and stays parseable", () => {
    expect(
      after.minutes[youthOf(base, after, base.league.clubs[0]?.id as string)[0]?.id as string],
    ).toBe(0);
    expect(parseCareer(JSON.parse(JSON.stringify(after))).ok).toBe(true);
  });

  it("is deterministic", () => {
    expect(generateYouthIntake(base)).toEqual(after);
  });

  it("does not change a club's youth when another club's squad changes", () => {
    const [a, b] = base.league.clubs;
    const changed = generateYouthIntake(
      withoutPlayers(base, b?.id as string, (p) => p.position === "GK"),
    );
    expect(youthOf(base, changed, a?.id as string)).toEqual(youthOf(base, after, a?.id as string));
  });

  it("guarantees a keeper to a club with only two goalkeepers", () => {
    const club = base.league.clubs[1]?.id as string;
    const squad = base.league.players.filter((p) => base.league.clubs[1]?.playerIds.includes(p.id));
    const keepers = squad.filter((p) => p.position === "GK").map((p) => p.id);
    const career = withoutPlayers(base, club, (p) => p.position === "GK");
    // Re-add exactly two keepers.
    const two = base.league.players.filter((p) => keepers.slice(0, 2).includes(p.id));
    const twoKeepers = {
      ...career,
      league: {
        ...career.league,
        clubs: career.league.clubs.map((c) =>
          c.id === club ? { ...c, playerIds: [...c.playerIds, ...two.map((p) => p.id)] } : c,
        ),
        players: [...career.league.players, ...two],
      },
    };
    const result = generateYouthIntake(twoKeepers);
    expect(youthOf(twoKeepers, result, club).filter((p) => p.position === "GK")).toHaveLength(1);
  });

  /** A career where club `index` has only `keep` defenders, midfielders and forwards. */
  const thinClub = (index: number, keep: { DEF: number; MID: number; FWD: number }) => {
    const club = base.league.clubs[index];
    const squad = base.league.players.filter((p) => club?.playerIds.includes(p.id));
    const drop = new Set<string>();
    for (const position of ["DEF", "MID", "FWD"] as const) {
      for (const p of squad.filter((x) => x.position === position).slice(keep[position])) {
        drop.add(p.id);
      }
    }
    const career = withoutPlayers(base, club?.id as string, (p) =>
      drop.has((p as unknown as { id: string }).id),
    );
    return { career, clubId: club?.id as string };
  };

  it("fills every line below its minimum when three players are enough", () => {
    const { career, clubId } = thinClub(2, { DEF: 4, MID: 4, FWD: 2 });
    const result = generateYouthIntake(career);
    expect(
      youthOf(career, result, clubId)
        .map((p) => p.position)
        .sort(),
    ).toEqual(["DEF", "FWD", "MID"]);
    expect(squadLimits(result, clubId).missing).toEqual({});
  });

  it("covers the biggest shortfalls first when three players are not enough", () => {
    const { career, clubId } = thinClub(3, { DEF: 3, MID: 4, FWD: 2 });
    const missing = Object.values(squadLimits(generateYouthIntake(career), clubId).missing);
    expect(missing.reduce((a, b) => a + b, 0)).toBe(1);
  });

  it("repairs the user's squad plan once youth makes the squad big enough again", () => {
    const user = base.league.clubs.find((c) => c.id === base.userClubId);
    const squad = base.league.players.filter((p) => user?.playerIds.includes(p.id));
    const retiring = new Set(
      (["DEF", "DEF", "DEF", "MID", "MID", "FWD"] as const).map((position, i) => {
        const same = squad.filter((p) => p.position === position);
        return same[i < 3 ? i : i - 3]?.id as string;
      }),
    );
    const old = {
      ...base,
      league: {
        ...base.league,
        players: base.league.players.map((p) => ({ ...p, age: retiring.has(p.id) ? 38 : 25 })),
      },
    };
    const retired = retirePlayers(old);
    expect(retired.league.clubs.find((c) => c.id === base.userClubId)?.playerIds).toHaveLength(16);
    const result = generateYouthIntake(retired);
    const ids = new Set(result.league.clubs.find((c) => c.id === base.userClubId)?.playerIds);
    for (const id of [...result.squadPlan.starters, ...result.squadPlan.bench]) {
      expect(ids.has(id)).toBe(true);
    }
    expect(result.squadPlan.starters).toHaveLength(11);
    expect(parseCareer(JSON.parse(JSON.stringify(result))).ok).toBe(true);
  });
});

describe("retire then youth over 20 rollovers", () => {
  it("keeps every squad between 18 and 34 players with at least 2 keepers", () => {
    let career = base;
    for (let season = 0; season < 20; season++) {
      const aged = developPlayers(career).players;
      career = retirePlayers({ ...career, league: { ...career.league, players: aged } });
      career = generateYouthIntake(career);
      for (const club of career.league.clubs) {
        const limits = squadLimits(career, club.id);
        expect(limits.count).toBeGreaterThanOrEqual(18);
        expect(limits.count).toBeLessThanOrEqual(MAX_SQUAD_SIZE + YOUTH_PER_CLUB + 1);
        expect(limits.missing.GK).toBeUndefined();
      }
      career = releaseSurplus(career);
      career = { ...career, season: { ...career.season, number: career.season.number + 1 } };
    }
    expect(POSITIONS).toHaveLength(4);
  });
});

/** Test-only stand-in for the AI release step of a later issue: drops the weakest surplus players. */
const releaseSurplus = (career: Career): Career => {
  const gone = new Set<string>();
  const clubs = career.league.clubs.map((club) => {
    const squad = career.league.players
      .filter((p) => club.playerIds.includes(p.id))
      .sort((a, b) => playerOverall(a) - playerOverall(b));
    const counts: Record<string, number> = {};
    for (const p of squad) counts[p.position] = (counts[p.position] ?? 0) + 1;
    let size = squad.length;
    for (const p of squad) {
      if (size <= MAX_SQUAD_SIZE) break;
      if ((counts[p.position] ?? 0) <= MIN_PER_POSITION[p.position]) continue;
      gone.add(p.id);
      counts[p.position] = (counts[p.position] ?? 0) - 1;
      size--;
    }
    return { ...club, playerIds: club.playerIds.filter((id) => !gone.has(id)) };
  });
  return {
    ...career,
    league: {
      ...career.league,
      clubs,
      players: career.league.players.filter((p) => !gone.has(p.id)),
    },
    contracts: Object.fromEntries(Object.entries(career.contracts).filter(([id]) => !gone.has(id))),
    condition: Object.fromEntries(Object.entries(career.condition).filter(([id]) => !gone.has(id))),
    minutes: Object.fromEntries(Object.entries(career.minutes).filter(([id]) => !gone.has(id))),
  };
};
