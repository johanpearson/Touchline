import { describe, expect, it } from "vitest";
import { NEUTRAL_TACTICS } from "../tactics";
import { aMatchInput, anEnginePlayer, aTeamSheet } from "./action-builders";
import { ENGINE_ATTRIBUTE_NAMES } from "./engine-player";

describe("action builders", () => {
  it("builds an average midfielder with all twelve attributes at 10", () => {
    const player = anEnginePlayer("x").build();

    expect(player.id).toBe("x");
    expect(player.position).toBe("MID");
    expect(Object.keys(player.attributes)).toEqual([...ENGINE_ATTRIBUTE_NAMES]);
    expect(Object.values(player.attributes).every((value) => value === 10)).toBe(true);
  });

  it("overrides one attribute without touching the others", () => {
    const player = anEnginePlayer().withAttribute("pace", 18).build();

    expect(player.attributes.pace).toBe(18);
    expect(player.attributes.passing).toBe(10);
  });

  it("builds a 4-4-2 team sheet with a goalkeeper first and unique ids", () => {
    const sheet = aTeamSheet().build();

    expect(sheet.starters).toHaveLength(11);
    expect(sheet.starters[0]?.position).toBe("GK");
    expect(new Set(sheet.starters.map((p) => p.id)).size).toBe(11);
  });

  it("regenerates starters when the formation changes", () => {
    const sheet = aTeamSheet().withFormation({ defenders: 3, midfielders: 5, forwards: 2 }).build();

    expect(sheet.starters.filter((p) => p.position === "DEF")).toHaveLength(3);
    expect(sheet.starters.filter((p) => p.position === "MID")).toHaveLength(5);
  });

  it("gives home and away different player ids", () => {
    const { home, away } = aMatchInput().build();
    const ids = new Set([...home.starters, ...away.starters].map((p) => p.id));

    expect(ids.size).toBe(22);
    expect(aMatchInput().build().engineVersion).toBe(2);
  });
});

describe("aTeamSheet attribute and tactics helpers", () => {
  it("sets every attribute of every player to one value", () => {
    const sheet = aTeamSheet().withAllAttributes(14).build();

    const all = [...sheet.starters, ...sheet.bench].flatMap((p) => Object.values(p.attributes));
    expect(new Set(all)).toEqual(new Set([14]));
  });

  it("sets the tactics", () => {
    const tactics = { ...NEUTRAL_TACTICS, pressing: "high" as const };

    expect(aTeamSheet().withTactics(tactics).build().tactics).toEqual(tactics);
  });
});
