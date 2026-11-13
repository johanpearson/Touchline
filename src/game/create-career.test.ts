import { describe, expect, it } from "vitest";
import { aCareer } from "./career-builders";
import { createCareer } from "./create-career";

describe("createCareer", () => {
  it("generates the league and a first season on matchday 1", () => {
    const career = aCareer(5);

    expect(career.league.clubs).toHaveLength(14);
    expect(career.season.number).toBe(1);
    expect(career.season.currentMatchday).toBe(1);
    expect(career.season.results).toEqual([]);
    expect(career.season.fixtures).toHaveLength(182);
  });

  it("is deterministic for the same seed and club", () => {
    expect(aCareer(9)).toEqual(aCareer(9));
  });

  it("rejects an unknown club id", () => {
    expect(createCareer({ seed: 1, userClubId: "nope" })).toEqual({
      ok: false,
      error: "unknown-club",
    });
  });
});
