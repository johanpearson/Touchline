import { describe, expect, it } from "vitest";
import { createRng } from "../engine";
import { autoPickLineup } from "./auto-pick-lineup";
import { FORMATION_SHAPE, FORMATIONS } from "./formation";
import { aCondition, aFullSquad, aPlayer } from "./game-builders";
import { generateSquad } from "./generate-squad";
import { validateLineup } from "./lineup";
import { pickBestEleven } from "./pick-best-eleven";

describe("autoPickLineup", () => {
  it.each(FORMATIONS)("fills %s plus a valid bench for 20 generated squads", (formation) => {
    for (let seed = 1; seed <= 20; seed++) {
      const squad = generateSquad({ clubId: "c", strength: 0.5 }, createRng(seed));
      const lineup = autoPickLineup(squad, formation);
      expect(lineup.formation).toBe(formation);
      expect(validateLineup(lineup, squad)).toEqual({ ok: true });
    }
  });

  it("gives the same lineup for the same input", () => {
    const squad = generateSquad({ clubId: "c", strength: 0.5 }, createRng(3));
    expect(autoPickLineup(squad, "3-5-2")).toEqual(autoPickLineup(squad, "3-5-2"));
  });

  it("picks the same eleven as pickBestEleven for 4-4-2 without condition", () => {
    const squad = generateSquad({ clubId: "c", strength: 0.6 }, createRng(5));
    const ids = pickBestEleven(squad).map((p) => p.id);
    expect(autoPickLineup(squad, "4-4-2").starters).toEqual(ids);
  });

  it("orders starters GK, DEF, MID, FWD", () => {
    const squad = aFullSquad();
    const positions = autoPickLineup(squad, "3-4-3").starters.map(
      (id) => squad.find((p) => p.id === id)?.position,
    );
    const shape = FORMATION_SHAPE["3-4-3"];
    expect(positions).toEqual([
      ...Array(shape.GK).fill("GK"),
      ...Array(shape.DEF).fill("DEF"),
      ...Array(shape.MID).fill("MID"),
      ...Array(shape.FWD).fill("FWD"),
    ]);
  });

  it("puts the best remaining keeper first on the bench", () => {
    const squad = [
      ...aFullSquad(10),
      aPlayer().withId("wall").withPosition("GK").withAllAttributes(20).build(),
      aPlayer().withId("second").withPosition("GK").withAllAttributes(15).build(),
    ];
    const lineup = autoPickLineup(squad, "4-4-2");
    expect(lineup.starters[0]).toBe("wall");
    expect(lineup.bench[0]).toBe("second");
  });

  it("covers every outfield line on the bench when possible", () => {
    const squad = aFullSquad();
    const lineup = autoPickLineup(squad, "4-4-2");
    const positions = new Set(lineup.bench.map((id) => squad.find((p) => p.id === id)?.position));
    expect(positions).toEqual(new Set(["GK", "DEF", "MID", "FWD"]));
  });

  it("fills the bench from the best remaining players after the position needs", () => {
    const strong = [1, 2, 3, 4, 5, 6].map((i) =>
      aPlayer().withId(`m${i}`).withPosition("MID").withAllAttributes(19).build(),
    );
    const lineup = autoPickLineup([...aFullSquad(10), ...strong], "4-4-2");
    const strongOnBench = lineup.bench.filter((id) => id.startsWith("m"));
    expect(strongOnBench).toHaveLength(2);
  });

  it("breaks ties by player id", () => {
    const lineup = autoPickLineup(aFullSquad(), "4-4-2");
    expect(lineup.starters.slice(1, 5)).toEqual(["p-DEF-0", "p-DEF-1", "p-DEF-2", "p-DEF-3"]);
  });

  it("replaces a tired star only when the replacement is better after scaling", () => {
    const squad = [
      ...aFullSquad(10),
      aPlayer().withId("star").withPosition("FWD").withAllAttributes(12).build(),
    ];
    const tired = { star: aCondition().withFitness(0).build() };
    // 12 * 0.85 = 10.2 still beats the 10s
    expect(autoPickLineup(squad, "4-4-2", tired).starters).toContain("star");

    const veryTired = [
      ...aFullSquad(10),
      aPlayer().withId("star").withPosition("FWD").withAllAttributes(11).build(),
    ];
    // 11 * 0.85 = 9.35 loses to the 10s
    const lineup = autoPickLineup(veryTired, "4-4-2", tired);
    expect(lineup.starters).not.toContain("star");
  });

  it("uses stored attributes for players missing from the condition map", () => {
    const squad = [
      ...aFullSquad(10),
      aPlayer().withId("star").withPosition("FWD").withAllAttributes(11).build(),
    ];
    expect(autoPickLineup(squad, "4-4-2", {}).starters).toContain("star");
  });

  it("throws a RangeError when the squad cannot fill the formation and bench", () => {
    expect(() => autoPickLineup(aFullSquad().slice(0, 12), "4-4-2")).toThrow(RangeError);
  });

  it("throws a RangeError when a line is short of players", () => {
    const noFwd = aFullSquad().filter((p) => p.position !== "FWD");
    expect(() => autoPickLineup(noFwd, "4-4-2")).toThrow(RangeError);
  });
});
