import { describe, expect, it } from "vitest";
import { NEUTRAL_TACTICS } from "../engine";
import { ATTRIBUTE_NAMES, type Player, type SquadPlan } from "../game";
import { planRows } from "./plan-rows";

const attrs = Object.fromEntries(ATTRIBUTE_NAMES.map((n) => [n, 10])) as Record<
  (typeof ATTRIBUTE_NAMES)[number],
  number
>;
const aPlayer = (id: string, position: Player["position"], pace = 10): Player => ({
  ...attrs,
  id,
  name: id.toUpperCase(),
  age: 25,
  position,
  pace,
});

const players = [aPlayer("a", "FWD"), aPlayer("b", "GK"), aPlayer("c", "DEF"), aPlayer("d", "DEF")];
const plan = {
  formation: "4-4-2",
  starters: ["a"],
  bench: ["c"],
  tactics: NEUTRAL_TACTICS,
} as SquadPlan;
const condition = { a: { fitness: 30, form: 8 }, b: { fitness: 90, form: 2 } };
const ids = (rows: ReturnType<typeof planRows>) => rows.map((r) => r.player.id);

describe("planRows", () => {
  it("marks each player as starter, bench or out", () => {
    const rows = planRows(players, plan, condition, { column: "name", direction: "asc" });
    expect(rows.map((r) => r.status)).toEqual(["starter", "out", "bench", "out"]);
  });

  it("defaults missing condition to full fitness and neutral form", () => {
    const row = planRows(players, plan, condition, { column: "name", direction: "asc" })[3];
    expect([row?.fitness, row?.form]).toEqual([100, 5]);
  });

  it("sorts by status with starters first", () => {
    expect(ids(planRows(players, plan, condition, { column: "status", direction: "asc" }))).toEqual(
      ["a", "c", "b", "d"],
    );
  });

  it("sorts by fitness descending and by position", () => {
    expect(
      ids(planRows(players, plan, condition, { column: "fitness", direction: "desc" })),
    ).toEqual(["c", "d", "b", "a"]);
    expect(
      ids(planRows(players, plan, condition, { column: "position", direction: "asc" })),
    ).toEqual(["b", "c", "d", "a"]);
  });

  it("sorts by form and overall", () => {
    expect(ids(planRows(players, plan, condition, { column: "form", direction: "desc" }))[0]).toBe(
      "a",
    );
    expect(
      ids(planRows(players, plan, condition, { column: "overall", direction: "asc" })).length,
    ).toBe(4);
  });
});
