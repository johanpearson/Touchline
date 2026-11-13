import { describe, expect, it } from "vitest";
import { aMatchInput, aTeamProfile } from "./match-builders";

const ratingKeys = [
  "buildUp",
  "progression",
  "chanceCreation",
  "finishing",
  "pressing",
  "defending",
  "goalkeeping",
] as const;

describe("aTeamProfile", () => {
  it("is called Team unless named", () => {
    expect(aTeamProfile().build().name).toBe("Team");
  });

  it("builds an average team with all seven ratings at 0.5", () => {
    const profile = aTeamProfile().build();

    for (const key of ratingKeys) expect(profile[key]).toBe(0.5);
  });

  it("overrides a single rating and the name", () => {
    const profile = aTeamProfile().named("Kvarnby").withFinishing(0.9).build();

    expect(profile.name).toBe("Kvarnby");
    expect(profile.finishing).toBe(0.9);
    expect(profile.defending).toBe(0.5);
  });

  it.each([
    ["withBuildUp", "buildUp"],
    ["withProgression", "progression"],
    ["withChanceCreation", "chanceCreation"],
    ["withFinishing", "finishing"],
    ["withPressing", "pressing"],
    ["withDefending", "defending"],
    ["withGoalkeeping", "goalkeeping"],
  ] as const)("%s sets only %s", (method, key) => {
    const profile = aTeamProfile()[method](0.8).build();

    for (const other of ratingKeys) expect(profile[other]).toBe(other === key ? 0.8 : 0.5);
  });

  it("sets every rating with withAllRatings", () => {
    const profile = aTeamProfile().withAllRatings(0.7).build();

    for (const key of ratingKeys) expect(profile[key]).toBe(0.7);
  });

  it("returns independent copies from build", () => {
    const builder = aTeamProfile();

    expect(builder.build()).not.toBe(builder.build());
  });
});

describe("aMatchInput", () => {
  it("builds two average teams with empty tactics", () => {
    const input = aMatchInput().build();

    expect(input.home).toEqual(aTeamProfile("Home").build());
    expect(input.away).toEqual(aTeamProfile("Away").build());
    expect(input.homeTactics).toEqual({});
    expect(input.awayTactics).toEqual({});
  });

  it("uses the given home and away profiles", () => {
    const strong = aTeamProfile("Strong").withAllRatings(0.9).build();
    const weak = aTeamProfile("Weak").withAllRatings(0.2).build();

    const input = aMatchInput().withHome(strong).withAway(weak).build();

    expect(input.home).toEqual(strong);
    expect(input.away).toEqual(weak);
  });
});
