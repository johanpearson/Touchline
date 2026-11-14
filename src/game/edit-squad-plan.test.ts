import { describe, expect, it } from "vitest";
import { NEUTRAL_TACTICS } from "../engine";
import { autoPickLineup } from "./auto-pick-lineup";
import { aCareer, deepFreeze } from "./career-builders";
import { autoPickUserLineup, setLineup, setTactics } from "./edit-squad-plan";

const userPlayers = (career: ReturnType<typeof aCareer>) => {
  const club = career.league.clubs.find((c) => c.id === career.userClubId);
  return career.league.players.filter((p) => club?.playerIds.includes(p.id));
};

describe("autoPickUserLineup", () => {
  it("fills the plan with the auto-picked lineup for the formation and keeps the tactics", () => {
    const career = aCareer();
    const attacking = { ...NEUTRAL_TACTICS, mentality: "attacking" as const };
    const tactical = setTactics(career, attacking);

    const picked = autoPickUserLineup(tactical, "4-3-3");

    expect(picked.squadPlan).toEqual({
      ...autoPickLineup(userPlayers(career), "4-3-3", career.condition),
      tactics: attacking,
    });
  });

  it("does not mutate the input", () => {
    const career = deepFreeze(aCareer());
    expect(() => autoPickUserLineup(career, "3-5-2")).not.toThrow();
  });
});

describe("setLineup", () => {
  it("replaces starters, bench and formation and keeps the tactics", () => {
    const career = aCareer();
    const lineup = autoPickLineup(userPlayers(career), "5-3-2", career.condition);

    const result = setLineup(career, lineup);

    expect(result).toEqual({
      ok: true,
      career: { ...career, squadPlan: { ...lineup, tactics: career.squadPlan.tactics } },
    });
  });

  it("returns the validation error for an invalid lineup", () => {
    const career = aCareer();
    const lineup = { ...career.squadPlan, starters: career.squadPlan.starters.slice(1) };

    expect(setLineup(career, lineup)).toEqual({ ok: false, error: "wrong-formation-shape" });
  });

  it("rejects players from another club", () => {
    const career = aCareer();
    const other = career.league.clubs[1] as { playerIds: string[] };
    const lineup = { ...career.squadPlan, starters: other.playerIds.slice(0, 11) };

    expect(setLineup(career, lineup)).toEqual({ ok: false, error: "unknown-player" });
  });

  it("leaves a frozen career unchanged on failure", () => {
    const career = deepFreeze(aCareer());
    const before = JSON.stringify(career);
    setLineup(career, { ...career.squadPlan, bench: [] });
    expect(JSON.stringify(career)).toBe(before);
  });
});

describe("setTactics", () => {
  it("replaces the tactics and keeps the lineup", () => {
    const career = aCareer();
    const tactics = {
      mentality: "defensive",
      pressing: "high",
      width: "wide",
      tempo: "slow",
    } as const;

    const next = setTactics(career, tactics);

    expect(next.squadPlan).toEqual({ ...career.squadPlan, tactics });
    expect(career.squadPlan.tactics).toEqual(NEUTRAL_TACTICS);
  });
});
