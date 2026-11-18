import { describe, expect, it } from "vitest";
import { type Career, isSeasonComplete, MAX_SQUAD_SIZE } from "../../game";
import { careerAfter, careerInOffSeason } from "../test-career";
import { expiringPlayers, isOffSeason, renewErrorKey, startBlock } from "./off-season-status";

const career = careerInOffSeason();

const userIds = (c: Career): string[] =>
  c.league.clubs.find((club) => club.id === c.userClubId)?.playerIds ?? [];

describe("isOffSeason", () => {
  it("is true once the season is finished and the window is open", () => {
    expect(isSeasonComplete(career.season)).toBe(true);
    expect(isOffSeason(career)).toBe(true);
  });

  it("is false during a season, and when the season is over but not finished", () => {
    expect(isOffSeason(careerAfter(5))).toBe(false);
    expect(isOffSeason(careerAfter(26))).toBe(false);
  });
});

describe("expiringPlayers", () => {
  it("lists the user's players whose contract has ended, best first", () => {
    const rows = expiringPlayers(career);

    expect(rows.length).toBeGreaterThan(0);
    const mine = new Set(userIds(career));
    for (const row of rows) {
      expect(mine.has(row.player.id)).toBe(true);
      expect(row.ends).toBeLessThanOrEqual(career.season.number);
      expect(row.ask).toBeGreaterThan(0);
    }
    expect(rows.map((r) => r.overall)).toEqual(
      [...rows.map((r) => r.overall)].sort((a, b) => b - a),
    );
  });

  it("does not list a player whose contract runs on", () => {
    const rows = expiringPlayers(career);
    const ids = new Set(rows.map((r) => r.player.id));

    const staying = userIds(career).filter((id) => !ids.has(id));

    expect(
      staying.every((id) => (career.contracts[id]?.expiresSeason ?? 0) > career.season.number),
    ).toBe(true);
  });
});

/** The career with the user's squad set to exactly these players, all on long contracts. */
const withSquad = (base: Career, ids: readonly string[]): Career => ({
  ...base,
  league: {
    ...base.league,
    clubs: base.league.clubs.map((c) =>
      c.id === base.userClubId ? { ...c, playerIds: [...ids] } : c,
    ),
  },
  contracts: {
    ...base.contracts,
    ...Object.fromEntries(ids.map((id) => [id, { wage: 1, expiresSeason: 99 }])),
  },
});

describe("startBlock", () => {
  const everyone = career.league.players.map((p) => p.id);
  const ofPosition = (position: string, count: number) =>
    career.league.players
      .filter((p) => p.position === position)
      .slice(0, count)
      .map((p) => p.id);
  const legal = [
    ...ofPosition("GK", 3),
    ...ofPosition("DEF", 7),
    ...ofPosition("MID", 7),
    ...ofPosition("FWD", 4),
  ];

  it("lets a legal squad start", () => {
    expect(startBlock(withSquad(career, legal))).toBeNull();
  });

  it("blocks a squad over 30 players and says how many there are", () => {
    const over = withSquad(career, everyone.slice(0, MAX_SQUAD_SIZE + 1));

    expect(startBlock(over)).toEqual({ kind: "over", count: 31, max: 30 });
  });

  it("blocks a squad below 18 players", () => {
    expect(startBlock(withSquad(career, legal.slice(0, 17)))).toMatchObject({
      kind: "under",
      count: 17,
      min: 18,
    });
  });

  it("blocks a squad that lacks a position and names what is missing", () => {
    const noKeeper = [...ofPosition("DEF", 8), ...ofPosition("MID", 8), ...ofPosition("FWD", 4)];

    expect(startBlock(withSquad(career, noKeeper))).toEqual({ kind: "positions", missing: "GK 2" });
  });

  it("counts the squad as it is once expired contracts have ended", () => {
    const expired = expiringPlayers(career).map((r) => r.player.id);
    const ids = userIds(career);

    const block = startBlock(career);

    const left = ids.length - expired.length;
    if (left < 18) expect(block).toMatchObject({ kind: "under", count: left });
    else expect(block === null || block.kind === "positions").toBe(true);
  });
});

describe("renewErrorKey", () => {
  it("maps a refusal to a message key", () => {
    expect(renewErrorKey("wage-too-low")).toBe("market.error.wage-too-low");
    expect(renewErrorKey("not-expiring")).toBe("offSeason.error.not-expiring");
  });
});
