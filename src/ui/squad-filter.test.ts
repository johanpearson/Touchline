import { describe, expect, it } from "vitest";
import type { Player } from "../game";
import type { PlanRow } from "./plan-rows";
import { averageAge, filterRows, normalizeText } from "./squad-filter";

const row = (name: string, position: Player["position"], age = 25): PlanRow => ({
  player: { id: name, name, position, age } as Player,
  overall: 60,
  fitness: 100,
  form: 5,
  status: "out",
});

const ROWS = [row("Åke Öberg", "GK"), row("Zoë Smith", "DEF"), row("Ola Nilsson", "FWD")];
const names = (rows: PlanRow[]) => rows.map((r) => r.player.name);

describe("normalizeText", () => {
  it("lowercases and removes diacritics", () => {
    expect(normalizeText("Åke Öberg")).toBe("ake oberg");
  });
});

describe("filterRows", () => {
  it("keeps everything for the all filter and an empty query", () => {
    expect(filterRows(ROWS, "all", "  ")).toHaveLength(3);
  });

  it("filters by position line", () => {
    expect(names(filterRows(ROWS, "DEF", ""))).toEqual(["Zoë Smith"]);
  });

  it("searches names without regard to case or diacritics", () => {
    expect(names(filterRows(ROWS, "all", "ake ober"))).toEqual(["Åke Öberg"]);
    expect(names(filterRows(ROWS, "all", "ZOE"))).toEqual(["Zoë Smith"]);
  });

  it("combines the position filter and the search", () => {
    expect(filterRows(ROWS, "DEF", "ola")).toEqual([]);
  });
});

describe("averageAge", () => {
  it("is the mean age, and 0 for no players", () => {
    expect(averageAge([row("a", "GK", 20).player, row("b", "GK", 25).player])).toBe(22.5);
    expect(averageAge([])).toBe(0);
  });
});
