import { describe, expect, it } from "vitest";
import { aTeamSheet } from "../action/action-builders";
import { NEUTRAL_TACTICS, type TeamTactics } from "../tactics";
import type { PhaseStart } from "./phase-step";
import { stageChance } from "./stage-strength";

const sheets = (home = aTeamSheet("Home", "h"), away = aTeamSheet("Away", "a")) => ({
  home: home.build(),
  away: away.build(),
});
const chance = (s: ReturnType<typeof sheets>, stage: 0 | 1 | 2, start: PhaseStart = "kickoff") =>
  stageChance(s, "home", stage, start);

describe("stageChance", () => {
  it("is higher for a stronger attack and lower for a stronger defence", () => {
    const base = chance(sheets(), 1);

    expect(chance(sheets(aTeamSheet("Home", "h").withAllAttributes(14)), 1)).toBeGreaterThan(base);
    expect(
      chance(sheets(undefined, aTeamSheet("Away", "a").withAllAttributes(14)), 1),
    ).toBeLessThan(base);
  });

  it("favours the home side by a small edge", () => {
    const even = sheets();

    expect(stageChance(even, "home", 1, "kickoff")).toBeGreaterThan(
      stageChance(even, "away", 1, "kickoff"),
    );
  });

  it("makes an attacking mentality riskier in build-up and more dangerous in the final third", () => {
    const attacking = sheets(
      aTeamSheet("Home", "h").withTactics({ ...NEUTRAL_TACTICS, mentality: "attacking" }),
    );

    expect(chance(attacking, 0)).toBeLessThan(chance(sheets(), 0));
    expect(chance(attacking, 2)).toBeGreaterThan(chance(sheets(), 2));
  });

  it("makes a high press win the ball more often in build-up", () => {
    const pressed = sheets(
      undefined,
      aTeamSheet("Away", "a").withTactics({ ...NEUTRAL_TACTICS, pressing: "high" }),
    );

    expect(chance(pressed, 0)).toBeLessThan(chance(sheets(), 0));
  });

  it("gives a counter more space against a high press, but not an ordinary possession", () => {
    const pressed = sheets(
      undefined,
      aTeamSheet("Away", "a").withTactics({ ...NEUTRAL_TACTICS, pressing: "high" }),
    );

    expect(chance(pressed, 2, "tackle")).toBeGreaterThan(chance(sheets(), 2, "tackle"));
    expect(chance(pressed, 2)).toBe(chance(sheets(), 2));
  });

  it("gives a set piece an edge in the final third", () => {
    expect(chance(sheets(), 2, "corner")).toBeGreaterThan(chance(sheets(), 2));
  });
});

/** A sheet whose attributes differ by player and attribute, so every term of the formula counts. */
const varied = (prefix: string, base: number) => {
  const { starters } = aTeamSheet("T", prefix).build();
  return aTeamSheet("T", prefix).withStarters(
    starters.map((p, i) => ({
      ...p,
      attributes: Object.fromEntries(
        Object.keys(p.attributes).map((name, j) => [
          name,
          Math.min(20, Math.max(1, base + ((i * 3 + j * 5) % 7) - 3)),
        ]),
      ) as typeof p.attributes,
    })),
  );
};
const tactics = (mentality: TeamTactics["mentality"], pressing: TeamTactics["pressing"]) => ({
  ...NEUTRAL_TACTICS,
  mentality,
  pressing,
});
const mixed = (home = varied("h", 12), away = varied("a", 9)) => sheets(home, away);

describe("stageChance values", () => {
  // Pinned values of the current model (#461). A deliberate retune updates them with the balance ranges.
  const at = (s: ReturnType<typeof sheets>, stage: 0 | 1 | 2, start: PhaseStart, team = "home") =>
    stageChance(s, team as "home" | "away", stage, start);

  it.each([
    [0, 0.749, 0.731],
    [1, 0.629, 0.611],
    [2, 0.114, 0.096],
  ] as const)(
    "gives average sides %s in stage %s and the away side a smaller share",
    (stage, home, away) => {
      expect(at(sheets(), stage, "kickoff")).toBeCloseTo(home, 6);
      expect(at(sheets(), stage, "kickoff", "away")).toBeCloseTo(away, 6);
    },
  );

  it.each([
    [0, 0.7729652777777778, 0.7039652777777777],
    [1, 0.6527291666666667, 0.5837291666666666],
    [2, 0.13702083333333334, 0.06802083333333335],
  ] as const)("weighs the attributes of both sides in stage %s", (stage, home, away) => {
    expect(at(mixed(), stage, "kickoff")).toBeCloseTo(home, 6);
    expect(at(mixed(), stage, "kickoff", "away")).toBeCloseTo(away, 6);
  });

  it("adds 0.1 to the final third from a corner or a free kick and nothing elsewhere", () => {
    expect(at(mixed(), 2, "corner")).toBeCloseTo(0.23702083333333335, 6);
    expect(at(mixed(), 2, "freeKick")).toBeCloseTo(0.23702083333333335, 6);
    expect(at(mixed(), 2, "throwIn")).toBeCloseTo(0.13702083333333334, 6);
    expect(at(mixed(), 1, "corner")).toBeCloseTo(0.6527291666666667, 6);
  });

  it("lets the goalkeeper count for a quarter of the final-third defence only", () => {
    const keeper = varied("a", 9).build();
    const strong = aTeamSheet("A", "a").withStarters(
      keeper.starters.map((p) =>
        p.position === "GK"
          ? {
              ...p,
              attributes: Object.fromEntries(
                Object.keys(p.attributes).map((k) => [k, 18]),
              ) as typeof p.attributes,
            }
          : p,
      ),
    );

    expect(at(mixed(undefined, strong), 2, "kickoff")).toBeCloseTo(0.12002083333333333, 6);
    expect(at(mixed(undefined, strong), 1, "kickoff")).toBeCloseTo(0.6527291666666667, 6);
  });

  it.each([
    ["defensive", 0, 0.8029652777777778, 0.7729652777777778],
    ["defensive", 1, 0.6302291666666667, 0.6297146008705242],
    ["defensive", 2, 0.08452083333333331, 0.11400626753719086],
    ["attacking", 0, 0.7429652777777778, 0.7729652777777778],
    ["attacking", 1, 0.6752291666666667, 0.763632715556258],
    ["attacking", 2, 0.18952083333333336, 0.2479243822229246],
  ] as const)(
    "moves a %s mentality's stage %s chance when it attacks or defends",
    (mentality, stage, own, against) => {
      const attacker = varied("h", 12).withTactics(tactics(mentality, "medium"));
      const defender = varied("a", 9).withTactics(tactics(mentality, "medium"));

      expect(at(mixed(attacker), stage, "tackle")).toBeCloseTo(own, 6);
      expect(at(mixed(undefined, defender), stage, "tackle")).toBeCloseTo(against, 6);
    },
  );

  it.each([
    ["low", 0, 0.8529652777777778, 0.8529652777777778],
    ["low", 1, 0.71487768256153, 0.7327291666666667],
    ["low", 2, 0.11916934922819655, 0.13702083333333334],
    ["high", 0, 0.6529652777777778, 0.6529652777777778],
    ["high", 1, 0.6206181497601154, 0.5327291666666667],
    ["high", 2, 0.2249098164267821, 0.13702083333333334],
  ] as const)(
    "moves the chance against a %s press in stage %s, by start",
    (pressing, stage, counter, ordinary) => {
      const defender = varied("a", 9).withTactics(tactics("balanced", pressing));

      expect(at(mixed(undefined, defender), stage, "tackle")).toBeCloseTo(counter, 6);
      expect(at(mixed(undefined, defender), stage, "kickoff")).toBeCloseTo(ordinary, 6);
    },
  );

  it("treats an interception as a counter as well", () => {
    const defender = varied("a", 9).withTactics(tactics("balanced", "high"));

    expect(at(mixed(undefined, defender), 1, "interception")).toBeCloseTo(0.6206181497601154, 6);
  });

  it("never goes below 0.03", () => {
    expect(
      at(
        sheets(
          aTeamSheet("H", "h").withAllAttributes(1),
          aTeamSheet("A", "a").withAllAttributes(20),
        ),
        2,
        "kickoff",
      ),
    ).toBe(0.03);
  });
});
