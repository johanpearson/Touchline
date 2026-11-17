import { describe, expect, it } from "vitest";
import { type Career, createCareer, generateLeague } from "../../game";
import { benchSlots, starterSlots, surname } from "./slots";

const career = (): Career => {
  const league = generateLeague({ seed: 11 });
  if (!league.ok) throw new Error("league");
  const created = createCareer({ seed: 11, userClubId: league.league.clubs[0]?.id ?? "" });
  if (!created.ok) throw new Error("career");
  return created.career;
};
const byIdOf = (c: Career) => new Map(c.league.players.map((p) => [p.id, p]));

describe("starterSlots", () => {
  it("places the eleven starters in the formation's slots, goalkeeper first", () => {
    const c = career();
    const slots = starterSlots(c, byIdOf(c));
    expect(slots).toHaveLength(11);
    expect(slots[0]?.line).toBe("GK");
    expect(slots[0]?.player.position).toBe("GK");
    for (const slot of slots) expect(slot.player.position).toBe(slot.line);
    expect(slots.map((s) => s.index)).toEqual([...Array(11).keys()]);
  });

  it("carries the player's fitness from the condition", () => {
    const c = career();
    const first = c.squadPlan.starters[0] ?? "";
    const tired: Career = {
      ...c,
      condition: { ...c.condition, [first]: { fitness: 42, form: 5 } },
    };
    const slot = starterSlots(tired, byIdOf(tired)).find((s) => s.player.id === first);
    expect(slot?.fitness).toBe(42);
  });
});

describe("fitness", () => {
  it("is rounded to a whole number for labels", () => {
    const c = career();
    const first = c.squadPlan.starters[0] ?? "";
    const tired: Career = {
      ...c,
      condition: { ...c.condition, [first]: { fitness: 92.5, form: 5 } },
    };
    expect(starterSlots(tired, byIdOf(tired)).find((s) => s.player.id === first)?.fitness).toBe(93);
  });
});

describe("benchSlots", () => {
  it("lists the seven bench players in plan order", () => {
    const c = career();
    expect(benchSlots(c, byIdOf(c)).map((s) => s.player.id)).toEqual(c.squadPlan.bench);
  });
});

describe("surname", () => {
  it("is the last word of the name", () => {
    expect(surname("Olof Berglund")).toBe("Berglund");
    expect(surname("Madonna")).toBe("Madonna");
  });
});
