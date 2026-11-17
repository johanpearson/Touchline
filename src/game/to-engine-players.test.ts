import { describe, expect, it } from "vitest";
import { MAX_ENGINE_ATTRIBUTE, MIN_ENGINE_ATTRIBUTE } from "../engine";
import { autoPickLineup } from "./auto-pick-lineup";
import { aCareer } from "./career-builders";
import { effectiveAttributes } from "./player-condition";
import { OUTFIELD_ONE_LINE_PENALTY } from "./position-rating";
import { clubSquad } from "./squad-plan";
import { toEngineBench, toEnginePlayers } from "./to-engine-players";

const setup = () => {
  const career = aCareer();
  const club = career.league.clubs[0] as (typeof career.league.clubs)[number];
  const squad = clubSquad(club, career.league.players);
  return { career, squad, lineup: autoPickLineup(squad, "4-3-3", career.condition) };
};

describe("toEnginePlayers", () => {
  it("lists the goalkeeper first, then defenders, midfielders and forwards", () => {
    const { career, squad, lineup } = setup();

    const starters = toEnginePlayers(lineup, squad, career.condition);

    expect(starters.map((p) => p.position)).toEqual([
      "GK",
      ...Array(4).fill("DEF"),
      ...Array(3).fill("MID"),
      ...Array(3).fill("FWD"),
    ]);
  });

  it("keeps the lane order of the lineup inside each line", () => {
    const { career, squad, lineup } = setup();
    const reversed = { ...lineup, starters: [...lineup.starters].reverse() };
    const byId = new Map(squad.map((p) => [p.id, p]));

    const starters = toEnginePlayers(reversed, squad, career.condition);

    const defenders = starters.filter((p) => p.position === "DEF").map((p) => p.id);
    const expected = reversed.starters.filter((id) => byId.get(id)?.position === "DEF");
    expect(defenders).toEqual(expected);
  });

  it("uses effective attributes from fitness and form", () => {
    const { career, squad, lineup } = setup();
    const tired = { ...career.condition, [lineup.starters[0] as string]: { fitness: 0, form: 5 } };
    const keeper = squad.find((p) => p.id === lineup.starters[0]) as (typeof squad)[number];

    const [first] = toEnginePlayers(lineup, squad, tired);

    expect(first?.attributes.handling).toBeCloseTo(
      effectiveAttributes(keeper, { fitness: 0, form: 5 }).handling,
    );
  });

  it("keeps every attribute inside the engine's 1 to 20 range", () => {
    const { squad, lineup } = setup();
    const extreme = Object.fromEntries(squad.map((p) => [p.id, { fitness: 100, form: 10 }]));
    const boosted = squad.map((p) => ({ ...p, passing: 20, tackling: 1 }));
    const drained = Object.fromEntries(squad.map((p) => [p.id, { fitness: 0, form: 1 }]));

    const all = [
      ...toEnginePlayers(lineup, boosted, extreme),
      ...toEnginePlayers(lineup, boosted, drained),
    ];

    for (const player of all) {
      for (const value of Object.values(player.attributes)) {
        expect(value).toBeGreaterThanOrEqual(MIN_ENGINE_ATTRIBUTE);
        expect(value).toBeLessThanOrEqual(MAX_ENGINE_ATTRIBUTE);
      }
    }
  });

  it("treats a player without a condition entry as fully fit with neutral form", () => {
    const { squad, lineup } = setup();
    const [first] = toEnginePlayers(lineup, squad, {});
    const keeper = squad.find((p) => p.id === lineup.starters[0]) as (typeof squad)[number];

    expect(first?.attributes.handling).toBe(keeper.handling);
  });

  it("gives goalkeepers usable distribution attributes (documented: weak with the feet)", () => {
    const { career, squad, lineup } = setup();
    const [keeper] = toEnginePlayers(lineup, squad, career.condition);

    expect(keeper?.attributes.handling).toBeGreaterThan(keeper?.attributes.passing ?? 0);
    expect(keeper?.attributes.passing).toBeGreaterThanOrEqual(MIN_ENGINE_ATTRIBUTE);
  });
});

describe("toEnginePlayers at a played position", () => {
  it("is unchanged when nobody is out of position", () => {
    const { career, squad, lineup } = setup();

    expect(toEnginePlayers(lineup, squad, career.condition, {})).toEqual(
      toEnginePlayers(lineup, squad, career.condition),
    );
  });

  it("rates a player at the played position and puts him in that line", () => {
    const { career, squad, lineup } = setup();
    const forwardId = lineup.starters.find(
      (id) => squad.find((p) => p.id === id)?.position === "FWD",
    ) as string;
    const forward = squad.find((p) => p.id === forwardId) as (typeof squad)[number];
    const own = toEnginePlayers(lineup, squad, career.condition).find((p) => p.id === forwardId);

    const moved = toEnginePlayers(lineup, squad, career.condition, { [forwardId]: "MID" });
    const result = moved.find((p) => p.id === forwardId);

    expect(result?.position).toBe("MID");
    expect(result?.attributes.finishing).toBeCloseTo(
      Math.max(1, (own?.attributes.finishing ?? 0) * (1 - OUTFIELD_ONE_LINE_PENALTY)),
    );
    expect(forward.position).toBe("FWD");
  });

  it("leaves every other player untouched", () => {
    const { career, squad, lineup } = setup();
    const forwardId = lineup.starters.find(
      (id) => squad.find((p) => p.id === id)?.position === "FWD",
    ) as string;
    const before = toEnginePlayers(lineup, squad, career.condition);

    const after = toEnginePlayers(lineup, squad, career.condition, { [forwardId]: "DEF" });

    for (const player of before.filter((p) => p.id !== forwardId)) {
      expect(after.find((p) => p.id === player.id)).toEqual(player);
    }
  });
});

describe("toEngineBench", () => {
  it("maps the bench in lineup order", () => {
    const { career, squad, lineup } = setup();

    const bench = toEngineBench(lineup, squad, career.condition);

    expect(bench.map((p) => p.id)).toEqual(lineup.bench);
  });
});
