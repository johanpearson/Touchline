import { describe, expect, it } from "vitest";
import { aPlayer } from "../game/game-builders";
import { groupSquad, type SortColumn } from "./squad-rows";

const squad = () => [
  aPlayer()
    .withId("f1")
    .withPosition("FWD")
    .withAllAttributes(8)
    .withName("Fia")
    .withAge(30)
    .build(),
  aPlayer()
    .withId("g1")
    .withPosition("GK")
    .withAllAttributes(12)
    .withName("Gus")
    .withAge(22)
    .build(),
  aPlayer()
    .withId("f2")
    .withPosition("FWD")
    .withAllAttributes(14)
    .withName("Finn")
    .withAge(19)
    .build(),
  aPlayer()
    .withId("d1")
    .withPosition("DEF")
    .withAllAttributes(10)
    .withName("Dag")
    .withAge(27)
    .build(),
];

const ids = (groups: ReturnType<typeof groupSquad>) =>
  groups.map((g) => [g.position, g.rows.map((r) => r.player.id)]);

describe("groupSquad", () => {
  it("groups by position in the order GK, DEF, MID, FWD and omits empty groups", () => {
    const groups = groupSquad(squad(), new Set(), { column: "overall", direction: "desc" });
    expect(groups.map((g) => g.position)).toEqual(["GK", "DEF", "FWD"]);
  });

  it("sorts by overall, best first, by default", () => {
    const groups = groupSquad(squad(), new Set(), { column: "overall", direction: "desc" });
    expect(ids(groups)).toContainEqual(["FWD", ["f2", "f1"]]);
  });

  it("marks players in the best eleven", () => {
    const groups = groupSquad(squad(), new Set(["f2"]), { column: "overall", direction: "desc" });
    const fwd = groups.find((g) => g.position === "FWD");
    expect(fwd?.rows.map((r) => r.inBestEleven)).toEqual([true, false]);
  });

  it("sorts within each group by the chosen column", () => {
    const groups = groupSquad(squad(), new Set(), { column: "age", direction: "asc" });
    expect(ids(groups)).toContainEqual(["FWD", ["f2", "f1"]]);
    const byName = groupSquad(squad(), new Set(), { column: "name", direction: "asc" });
    expect(ids(byName)).toContainEqual(["FWD", ["f1", "f2"]]);
  });

  it("sorts by an attribute and reverses with the direction", () => {
    const column: SortColumn = "pace";
    const asc = groupSquad(squad(), new Set(), { column, direction: "asc" });
    expect(ids(asc)).toContainEqual(["FWD", ["f1", "f2"]]);
  });

  it("breaks ties by id so the order is stable", () => {
    const twins = [
      aPlayer().withId("b").withPosition("MID").withAllAttributes(10).build(),
      aPlayer().withId("a").withPosition("MID").withAllAttributes(10).build(),
    ];
    const groups = groupSquad(twins, new Set(), { column: "overall", direction: "desc" });
    expect(ids(groups)).toEqual([["MID", ["a", "b"]]]);
  });
});
