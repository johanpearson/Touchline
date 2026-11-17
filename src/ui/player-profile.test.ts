import { describe, expect, it } from "vitest";
import type { Career } from "../game";
import { effectiveAttributes, playerOverall } from "../game";
import { attributeBand, attributeGroups, playerProfile } from "./player-profile";
import { careerAfter } from "./test-career";

const userPlayerId = (career: Career, position: "GK" | "DEF" | "MID" | "FWD") => {
  const club = career.league.clubs.find((c) => c.id === career.userClubId);
  const player = career.league.players.find(
    (p) => p.position === position && club?.playerIds.includes(p.id),
  );
  if (!player) throw new Error("player");
  return player.id;
};

describe("attributeBand", () => {
  it("splits 1-7 low, 8-13 mid and 14-20 high", () => {
    expect([1, 7, 8, 13, 14, 20].map(attributeBand)).toEqual([
      "low",
      "low",
      "mid",
      "mid",
      "high",
      "high",
    ]);
  });
});

describe("attributeGroups", () => {
  it("shows technical and physical attributes for outfield players", () => {
    const groups = attributeGroups("MID");
    expect(groups.map((g) => g.id)).toEqual(["technical", "physical"]);
    expect(groups.flatMap((g) => g.names)).not.toContain("handling");
  });

  it("adds goalkeeping for keepers", () => {
    const groups = attributeGroups("GK");
    expect(groups.map((g) => g.id)).toEqual(["technical", "physical", "goalkeeping"]);
    expect(groups.find((g) => g.id === "goalkeeping")?.names).toEqual(["handling", "reflexes"]);
  });

  it("lists every attribute exactly once for a keeper", () => {
    const names = attributeGroups("GK").flatMap((g) => g.names);
    expect(new Set(names).size).toBe(12);
    expect(names).toHaveLength(12);
  });
});

describe("playerProfile", () => {
  it("returns null for an unknown player", () => {
    expect(playerProfile(careerAfter(0), "nope")).toBeNull();
  });

  it("carries the stored player, club, overall and condition", () => {
    const career = careerAfter(2);
    const id = userPlayerId(career, "MID");
    const profile = playerProfile(career, id);
    const player = career.league.players.find((p) => p.id === id);
    expect(profile?.player).toBe(player);
    expect(profile?.club.id).toBe(career.userClubId);
    expect(profile?.overall).toBe(player ? playerOverall(player) : -1);
    expect(profile?.fitness).toBe(career.condition[id]?.fitness ?? 100);
    expect(profile?.form).toBe(career.condition[id]?.form ?? 5);
  });

  it("exposes effective attributes separately from the stored ones", () => {
    const career = careerAfter(2);
    const id = userPlayerId(career, "FWD");
    const profile = playerProfile(career, id);
    const player = career.league.players.find((p) => p.id === id);
    const condition = career.condition[id];
    if (!player || !condition) throw new Error("fixture");
    expect(profile?.effective).toEqual(effectiveAttributes(player, condition));
    expect(profile?.player.finishing).toBe(player.finishing);
  });

  it("reports the matchday squad status of the user's players only", () => {
    const career = careerAfter(0);
    const starter = career.squadPlan.starters[0] ?? "";
    expect(playerProfile(career, starter)?.status).toBe("starter");
    const other = career.league.clubs.find((c) => c.id !== career.userClubId);
    expect(playerProfile(career, other?.playerIds[0] ?? "")?.status).toBeNull();
  });

  it("tallies goals from the result scorers", () => {
    const career = careerAfter(0);
    const id = userPlayerId(career, "FWD");
    const club = career.userClubId;
    const opponent = career.league.clubs.find((c) => c.id !== club)?.id ?? "";
    const withResults: Career = {
      ...career,
      season: {
        ...career.season,
        results: [
          {
            fixtureId: "a",
            homeClubId: club,
            awayClubId: opponent,
            homeGoals: 2,
            awayGoals: 0,
            engineVersion: 1,
            scorers: [id, id],
          },
          {
            fixtureId: "b",
            homeClubId: opponent,
            awayClubId: club,
            homeGoals: 0,
            awayGoals: 1,
            engineVersion: 1,
            scorers: [id],
          },
        ] as Career["season"]["results"],
      },
    };
    expect(playerProfile(withResults, id)?.goals).toBe(3);
  });

  it("reports goals as not recorded when a result of the club has no scorers", () => {
    const career = careerAfter(0);
    const id = userPlayerId(career, "FWD");
    const club = career.userClubId;
    const opponent = career.league.clubs.find((c) => c.id !== club)?.id ?? "";
    const old: Career = {
      ...career,
      season: {
        ...career.season,
        results: [
          {
            fixtureId: "a",
            homeClubId: club,
            awayClubId: opponent,
            homeGoals: 1,
            awayGoals: 0,
            engineVersion: 1,
          },
        ] as Career["season"]["results"],
      },
    };
    expect(playerProfile(old, id)?.goals).toBeNull();
  });

  it("shows zero goals before any match is played", () => {
    const career = careerAfter(0);
    expect(playerProfile(career, userPlayerId(career, "MID"))?.goals).toBe(0);
  });
});
