import { describe, expect, it } from "vitest";
import type { TeamMatchProfile } from "../engine";
import { deriveTeamProfile } from "./derive-team-profile";
import { aClub, aPlayer, aSquad } from "./game-builders";
import type { Player } from "./player";

const profileOf = (squad: Player[]): TeamMatchProfile =>
  deriveTeamProfile(
    aClub()
      .withName("Kvarnby IF")
      .withPlayerIds(squad.map((p) => p.id))
      .build(),
    squad,
  );

const ratings = (p: TeamMatchProfile): number[] => [
  p.buildUp,
  p.progression,
  p.chanceCreation,
  p.finishing,
  p.pressing,
  p.defending,
  p.goalkeeping,
];

describe("deriveTeamProfile", () => {
  it("uses the club name", () => {
    expect(profileOf(aSquad()).name).toBe("Kvarnby IF");
  });

  it("gives about 0.5 on every rating for an all-10 squad", () => {
    for (const r of ratings(profileOf(aSquad(10)))) expect(r).toBeCloseTo(0.5, 1);
  });

  it("gives 0 for an all-1 squad and 1 for an all-20 squad", () => {
    expect(ratings(profileOf(aSquad(1)))).toEqual(Array(7).fill(0));
    expect(ratings(profileOf(aSquad(20)))).toEqual(Array(7).fill(1));
  });

  it("ignores players who are not in the club", () => {
    const squad = aSquad(10);
    const club = aClub()
      .withPlayerIds(squad.map((p) => p.id))
      .build();
    const outsider = aPlayer().withId("out").withPosition("GK").withAllAttributes(20).build();
    expect(deriveTeamProfile(club, [...squad, outsider])).toEqual(deriveTeamProfile(club, squad));
  });

  const cases: [string, keyof Player, Player["position"], keyof TeamMatchProfile][] = [
    ["passing", "passing", "MID", "buildUp"],
    ["ballControl", "ballControl", "DEF", "buildUp"],
    ["dribbling", "dribbling", "FWD", "progression"],
    ["pace", "pace", "DEF", "progression"],
    ["vision", "vision", "MID", "progression"],
    ["vision", "vision", "FWD", "chanceCreation"],
    ["passing", "passing", "MID", "chanceCreation"],
    ["finishing", "finishing", "FWD", "finishing"],
    ["finishing", "finishing", "MID", "finishing"],
    ["workRate", "workRate", "MID", "pressing"],
    ["strength", "strength", "DEF", "pressing"],
    ["tackling", "tackling", "DEF", "defending"],
    ["positioning", "positioning", "MID", "defending"],
    ["handling", "handling", "GK", "goalkeeping"],
    ["reflexes", "reflexes", "GK", "goalkeeping"],
  ];

  it.each(cases)("raising %s of a %s raises %s", (_n, attribute, position, rating) => {
    const base = aSquad(10);
    const raised = base.map((p) => (p.position === position ? { ...p, [attribute]: 20 } : p));
    expect(profileOf(raised)[rating]).toBeGreaterThan(profileOf(base)[rating] as number);
  });

  it("never lowers any rating when any single attribute is raised", () => {
    const base = aSquad(10);
    const before = ratings(profileOf(base));
    for (const attribute of [
      "passing",
      "ballControl",
      "dribbling",
      "pace",
      "vision",
      "finishing",
      "workRate",
      "tackling",
      "positioning",
      "strength",
      "handling",
      "reflexes",
    ] as const) {
      const after = ratings(profileOf(base.map((p) => ({ ...p, [attribute]: 15 }))));
      for (const [i, value] of after.entries()) {
        expect(value).toBeGreaterThanOrEqual(before[i] as number);
      }
    }
  });
});
