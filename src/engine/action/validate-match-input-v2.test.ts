import { describe, expect, it } from "vitest";
import { aMatchInputV2, anEnginePlayer, aTeamSheet } from "./action-builders";
import { validateMatchInputV2 } from "./validate-match-input-v2";

const codesOf = (input: ReturnType<ReturnType<typeof aMatchInputV2>["build"]>) => {
  const result = validateMatchInputV2(input);
  return result.ok ? [] : result.errors.map((e) => e.code);
};

describe("validateMatchInputV2", () => {
  it("accepts a valid input", () => {
    expect(validateMatchInputV2(aMatchInputV2().build())).toEqual({ ok: true });
  });

  it("reports a wrong starter count with the side", () => {
    const home = aTeamSheet("Home", "h").build();
    const input = aMatchInputV2()
      .withHome({ ...home, starters: home.starters.slice(0, 10) })
      .build();

    const result = validateMatchInputV2(input);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.find((e) => e.code === "starterCount")?.side).toBe("home");
    }
  });

  it("reports a missing goalkeeper", () => {
    const home = aTeamSheet("Home", "h").build();
    const starters = home.starters.map((p, i) =>
      i === 0 ? { ...p, position: "DEF" as const } : p,
    );

    expect(
      codesOf(
        aMatchInputV2()
          .withHome({ ...home, starters })
          .build(),
      ),
    ).toContain("goalkeeperCount");
  });

  it("reports several goalkeepers", () => {
    const home = aTeamSheet("Home", "h").build();
    const starters = home.starters.map((p, i) => (i === 1 ? { ...p, position: "GK" as const } : p));

    expect(
      codesOf(
        aMatchInputV2()
          .withHome({ ...home, starters })
          .build(),
      ),
    ).toContain("goalkeeperCount");
  });

  it("reports formation counts that do not sum to 10", () => {
    const away = aTeamSheet("Away", "a").build();
    const input = aMatchInputV2()
      .withAway({ ...away, formation: { defenders: 4, midfielders: 4, forwards: 3 } })
      .build();

    expect(codesOf(input)).toContain("formationCount");
  });

  it("reports players that do not match the formation lines", () => {
    const away = aTeamSheet("Away", "a").build();
    const input = aMatchInputV2()
      .withAway({ ...away, formation: { defenders: 3, midfielders: 5, forwards: 2 } })
      .build();

    expect(codesOf(input)).toEqual(["lineMismatch"]);
  });

  it("reports a duplicate id within a side", () => {
    const home = aTeamSheet("Home", "h").build();
    const bench = [anEnginePlayer("h-2").build()];

    const result = validateMatchInputV2(
      aMatchInputV2()
        .withHome({ ...home, bench })
        .build(),
    );

    expect(result).toMatchObject({
      ok: false,
      errors: [{ code: "duplicateId", side: "home", playerId: "h-2" }],
    });
  });

  it("reports an id shared by both sides", () => {
    const away = aTeamSheet("Away", "h").build();

    expect(codesOf(aMatchInputV2().withAway(away).build())).toContain("duplicateId");
  });

  it.each([0, 21, Number.NaN])("reports an attribute of %s", (value) => {
    const home = aTeamSheet("Home", "h").build();
    const starters = home.starters.map((p, i) =>
      i === 3
        ? anEnginePlayer(p.id).withPosition(p.position).withAttribute("pace", value).build()
        : p,
    );

    const result = validateMatchInputV2(
      aMatchInputV2()
        .withHome({ ...home, starters })
        .build(),
    );

    expect(result).toMatchObject({
      ok: false,
      errors: [{ code: "attributeRange", side: "home", playerId: "h-4" }],
    });
  });

  it("accepts attributes at the limits 1 and 20", () => {
    const home = aTeamSheet("Home", "h").build();
    const starters = home.starters.map((p, i) =>
      i === 3
        ? anEnginePlayer(p.id)
            .withPosition(p.position)
            .withAttribute("pace", 1)
            .withAttribute("passing", 20)
            .build()
        : p,
    );

    expect(
      validateMatchInputV2(
        aMatchInputV2()
          .withHome({ ...home, starters })
          .build(),
      ).ok,
    ).toBe(true);
  });

  it("reports every problem at once", () => {
    const home = aTeamSheet("Home", "h").build();
    const input = aMatchInputV2()
      .withHome({ ...home, starters: home.starters.slice(1), bench: [] })
      .withAway({
        ...aTeamSheet("Away", "a").build(),
        formation: { defenders: 4, midfielders: 4, forwards: 3 },
      })
      .build();

    expect(codesOf(input)).toEqual([
      "starterCount",
      "goalkeeperCount",
      "formationCount",
      "lineMismatch",
    ]);
  });
});
