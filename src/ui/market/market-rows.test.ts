import { describe, expect, it } from "vitest";
import { askingPrice, signingWage } from "../../game";
import { careerInWindow } from "../test-career";
import { freeAgentRows, offerRows, ownPlayerRows, playerRows } from "./market-rows";

const career = careerInWindow();

describe("playerRows", () => {
  const rows = playerRows(career);

  it("lists the players of every AI club and none of the user's", () => {
    const own = new Set(
      career.league.clubs.find((c) => c.id === career.userClubId)?.playerIds ?? [],
    );
    const others = career.league.clubs.filter((c) => c.id !== career.userClubId);
    expect(rows).toHaveLength(others.reduce((sum, c) => sum + c.playerIds.length, 0));
    expect(rows.some((row) => own.has(row.player.id))).toBe(false);
  });

  it("carries the selling club, the asking price and the wage the player asks", () => {
    const row = rows[0];
    if (!row) throw new Error("no rows");
    expect(row.clubName).toBe(career.league.clubs.find((c) => c.id === row.clubId)?.name);
    expect(row.fee).toBe(askingPrice(career, row.player.id));
    expect(row.wage).toBe(signingWage(career, row.player.id));
  });

  it("gives potential as one to five stars", () => {
    for (const row of rows) {
      expect(row.potentialStars).toBeGreaterThanOrEqual(1);
      expect(row.potentialStars).toBeLessThanOrEqual(5);
    }
  });
});

describe("freeAgentRows", () => {
  const rows = freeAgentRows(career);

  it("lists every free agent without a club and without a fee", () => {
    expect(rows.map((row) => row.player.id).sort()).toEqual([...career.freeAgentIds].sort());
    for (const row of rows) {
      expect(row.clubId).toBeNull();
      expect(row.fee).toBe(0);
      expect(row.wage).toBe(signingWage(career, row.player.id));
    }
  });
});

describe("offerRows", () => {
  it("describes each incoming offer with the player and the buying club", () => {
    const rows = offerRows(career);
    expect(rows).toHaveLength(career.offers.length);
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      const offer = career.offers.find((o) => o.id === row.offer.id);
      expect(row.player.id).toBe(offer?.playerId);
      expect(row.clubName).toBe(career.league.clubs.find((c) => c.id === offer?.fromClubId)?.name);
    }
  });
});

describe("ownPlayerRows", () => {
  it("lists the user's players with value and wage", () => {
    const rows = ownPlayerRows(career);
    const club = career.league.clubs.find((c) => c.id === career.userClubId);
    expect(rows).toHaveLength(club?.playerIds.length ?? -1);
    for (const row of rows) expect(row.wage).toBe(career.contracts[row.player.id]?.wage);
  });
});
