import { describe, expect, it } from "vitest";
import { aCareer, deepFreeze } from "./career-builders";
import { developPlayers } from "./develop-players";

describe("developPlayers", () => {
  it("returns every league player a year older, in order", () => {
    const career = aCareer();

    const { players } = developPlayers(career);

    expect(players.map((p) => p.id)).toEqual(career.league.players.map((p) => p.id));
    expect(players.map((p) => p.age)).toEqual(career.league.players.map((p) => p.age + 1));
  });

  it("is deterministic and does not change the career", () => {
    const career = deepFreeze(structuredClone(aCareer()));

    expect(developPlayers(career)).toEqual(developPlayers(career));
  });

  it("uses a different stream per season", () => {
    const career = aCareer();
    const later = { ...career, season: { ...career.season, number: career.season.number + 1 } };

    expect(developPlayers(later).players).not.toEqual(developPlayers(career).players);
  });

  it("lists the changes of the players that changed", () => {
    const career = aCareer();

    const { players, changes } = developPlayers(career);

    expect(changes.length).toBeGreaterThan(0);
    for (const change of changes) {
      const before = career.league.players.find((p) => p.id === change.playerId);
      const after = players.find((p) => p.id === change.playerId);
      expect(before?.[change.attribute]).toBe(change.before);
      expect(after?.[change.attribute]).toBe(change.after);
    }
  });

  it("develops young players with more minutes further", () => {
    const career = aCareer();
    const young = career.league.players.filter((p) => p.age <= 21 && p.position !== "GK");
    const gain = (minutes: number): number => {
      const { players } = developPlayers({
        ...career,
        minutes: Object.fromEntries(young.map((p) => [p.id, minutes])),
      });
      return players
        .filter((p) => young.some((y) => y.id === p.id))
        .reduce((s, p) => s + p.passing + p.pace + p.finishing, 0);
    };

    expect(gain(1800)).toBeGreaterThan(gain(0));
  });
});
