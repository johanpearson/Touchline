import { describe, expect, it } from "vitest";
import { generateLeague, pickBestEleven } from "../game";
import { attributeBandOf, clubSquadRows } from "./club-rows";

const league = () => {
  const generated = generateLeague({ seed: 5 });
  if (!generated.ok) throw new Error("league");
  return generated.league;
};

const squadOf = (index: number) => {
  const l = league();
  const club = l.clubs[index];
  return l.players.filter((p) => club?.playerIds.includes(p.id));
};

describe("clubSquadRows", () => {
  it("returns one row per player with default fitness 100 and form 5", () => {
    const players = squadOf(0);
    const rows = clubSquadRows(players, {});
    expect(rows).toHaveLength(players.length);
    expect(rows.every((r) => r.fitness === 100 && r.form === 5)).toBe(true);
  });

  it("uses the recorded condition of a player", () => {
    const players = squadOf(0);
    const id = players[0]?.id ?? "";
    const row = clubSquadRows(players, { [id]: { fitness: 42, form: 8 } }).find(
      (r) => r.player.id === id,
    );
    expect([row?.fitness, row?.form]).toEqual([42, 8]);
  });

  it("marks exactly the automatic best eleven", () => {
    const players = squadOf(1);
    const eleven = new Set(pickBestEleven(players).map((p) => p.id));
    const marked = clubSquadRows(players, {}).filter((r) => r.inBestEleven);
    expect(new Set(marked.map((r) => r.player.id))).toEqual(eleven);
  });
});

describe("attributeBandOf", () => {
  it.each([
    [1, "low"],
    [7, "low"],
    [8, "mid"],
    [13, "mid"],
    [14, "high"],
    [20, "high"],
  ] as const)("puts %i in the %s band", (value, band) => {
    expect(attributeBandOf(value)).toBe(band);
  });
});
