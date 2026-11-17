import { describe, expect, it } from "vitest";
import { NEUTRAL_TACTICS } from "../engine";
import { autoPickLineup } from "./auto-pick-lineup";
import { aCareer } from "./career-builders";
import { createCareer } from "./create-career";
import { initialCondition } from "./player-condition";

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

  it("starts with the 4-4-2 auto-picked lineup and neutral tactics for the user's club", () => {
    const career = aCareer(5);
    const club = career.league.clubs.find((c) => c.id === career.userClubId);
    const squad = career.league.players.filter((p) => club?.playerIds.includes(p.id));

    expect(career.squadPlan).toEqual({
      ...autoPickLineup(squad, "4-4-2"),
      tactics: NEUTRAL_TACTICS,
    });
  });

  it("starts every player in the league at full fitness and neutral form", () => {
    const career = aCareer(5);

    expect(Object.keys(career.condition).sort()).toEqual(
      career.league.players.map((p) => p.id).sort(),
    );
    expect(
      Object.values(career.condition).every(
        (c) => c.fitness === initialCondition().fitness && c.form === initialCondition().form,
      ),
    ).toBe(true);
  });

  it("plays on the action engine", () => {
    expect(aCareer(5).engineVersion).toBe(2);
  });

  it("starts with contracts, finances, no free agents and zero minutes", () => {
    const career = aCareer(5);
    expect(Object.keys(career.contracts)).toHaveLength(career.league.players.length);
    expect(Object.keys(career.finances)).toHaveLength(career.league.clubs.length);
    expect(career.freeAgentIds).toEqual([]);
    expect(Object.values(career.minutes).every((m) => m === 0)).toBe(true);
  });

  it("creates identical economy data twice from the same spec", () => {
    const a = createCareer({ seed: 5, userClubId: aCareer(5).userClubId });
    const b = createCareer({ seed: 5, userClubId: aCareer(5).userClubId });
    expect(a).toEqual(b);
  });
});
