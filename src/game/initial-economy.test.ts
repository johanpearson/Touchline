import { describe, expect, it } from "vitest";
import { aCareer } from "./career-builders";
import { aPlayer } from "./game-builders";
import {
  INCOME_SHARE_OF_SQUAD_VALUE,
  initialContracts,
  initialFinances,
  initialMinutes,
} from "./initial-economy";
import { playerValue, wageFor } from "./player-value";

const career = aCareer(3);
const { players, clubs } = career.league;

describe("initialContracts", () => {
  const contracts = initialContracts(players, 3, 1);

  it("gives every player a contract of 1 to 5 seasons", () => {
    expect(Object.keys(contracts)).toHaveLength(players.length);
    for (const contract of Object.values(contracts)) {
      expect(contract.expiresSeason).toBeGreaterThanOrEqual(1);
      expect(contract.expiresSeason).toBeLessThanOrEqual(5);
    }
  });

  it("uses every length", () => {
    const lengths = new Set(Object.values(contracts).map((c) => c.expiresSeason));
    expect([...lengths].sort()).toEqual([1, 2, 3, 4, 5]);
  });

  it("asks the wage of the player's value", () => {
    const player = players[0] ?? aPlayer().build();
    const contract = contracts[player.id];
    expect(contract?.wage).toBe(wageFor(playerValue(player, contract ?? { expiresSeason: 1 }, 1)));
  });

  it("counts the length from the given season", () => {
    const later = initialContracts(players, 3, 4);
    const id = players[0]?.id ?? "";
    expect((later[id]?.expiresSeason ?? 0) - (contracts[id]?.expiresSeason ?? 0)).toBe(3);
  });

  it("is deterministic for a seed and differs between seeds", () => {
    expect(initialContracts(players, 3, 1)).toEqual(contracts);
    expect(initialContracts(players, 4, 1)).not.toEqual(contracts);
  });
});

describe("initialFinances", () => {
  const contracts = initialContracts(players, 3, 1);
  const finances = initialFinances(clubs, players, contracts, 1);

  it("starts every club with balance 0", () => {
    expect(Object.keys(finances)).toHaveLength(clubs.length);
    expect(Object.values(finances).every((f) => f.balance === 0)).toBe(true);
  });

  it("sets base income to a share of the squad value", () => {
    const club = clubs[0];
    if (!club) throw new Error("no club");
    const total = club.playerIds.reduce((sum, id) => {
      const player = players.find((p) => p.id === id);
      const contract = contracts[id];
      return player && contract ? sum + playerValue(player, contract, 1) : sum;
    }, 0);
    expect(finances[club.id]?.baseIncome).toBe(Math.round(total * INCOME_SHARE_OF_SQUAD_VALUE));
  });

  it("leaves room in the income for the wage bill", () => {
    for (const club of clubs) {
      const wages = club.playerIds.reduce((sum, id) => sum + (contracts[id]?.wage ?? 0), 0);
      expect(wages).toBeLessThan((finances[club.id]?.baseIncome ?? 0) * 0.75);
    }
  });
});

describe("initialMinutes", () => {
  it("is zero for every player", () => {
    const minutes = initialMinutes(players);
    expect(Object.keys(minutes)).toHaveLength(players.length);
    expect(Object.values(minutes).every((m) => m === 0)).toBe(true);
  });
});
