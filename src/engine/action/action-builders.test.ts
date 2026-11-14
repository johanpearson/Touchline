import { describe, expect, it } from "vitest";
import { aMatchInputV2, anEnginePlayer, aTeamSheet } from "./action-builders";
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
    const { home, away } = aMatchInputV2().build();
    const ids = new Set([...home.starters, ...away.starters].map((p) => p.id));

    expect(ids.size).toBe(22);
    expect(aMatchInputV2().build().engineVersion).toBe(2);
  });
});
