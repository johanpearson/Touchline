import { describe, expect, it } from "vitest";
import { NEUTRAL_TACTICS, validateMatchInput } from "../engine";
import { aCareer } from "./career-builders";
import { autoPickUserLineup, setTactics } from "./edit-squad-plan";
import { matchInputFor } from "./match-input-for";

const userFixture = (career: ReturnType<typeof aCareer>) =>
  career.season.fixtures.find(
    (f) => f.homeClubId === career.userClubId || f.awayClubId === career.userClubId,
  ) as (typeof career.season.fixtures)[number];

const sideOf = (career: ReturnType<typeof aCareer>, fixture: { homeClubId: string }) =>
  fixture.homeClubId === career.userClubId ? "home" : "away";

describe("matchInputFor", () => {
  it("gives a valid input with sheets for both clubs", () => {
    const career = aCareer();
    const fixture = userFixture(career);

    const input = matchInputFor(career, fixture);

    expect(input.engineVersion).toBe(3);
    expect(validateMatchInput(input)).toEqual({ ok: true });
    const user = input[sideOf(career, fixture)];
    expect(user.formation).toEqual({ defenders: 4, midfielders: 4, forwards: 2 });
    expect(user.starters.map((p) => p.id)).toEqual(
      expect.arrayContaining(career.squadPlan.starters),
    );
    expect(user.bench.map((p) => p.id)).toEqual(career.squadPlan.bench);
  });

  it("uses the user's formation and tactics on the user's side only, AI clubs 4-4-2 neutral", () => {
    const attacking = { ...NEUTRAL_TACTICS, mentality: "attacking" as const };
    const career = setTactics(autoPickUserLineup(aCareer(), "3-4-3"), attacking);
    const fixture = userFixture(career);

    const input = matchInputFor(career, fixture);

    const user = sideOf(career, fixture);
    const other = user === "home" ? "away" : "home";
    expect(input[user].formation).toEqual({ defenders: 3, midfielders: 4, forwards: 3 });
    expect(input[user].tactics).toEqual(attacking);
    expect(input[other].formation).toEqual({ defenders: 4, midfielders: 4, forwards: 2 });
    expect(input[other].tactics).toEqual(NEUTRAL_TACTICS);
  });

  it("plays AI clubs in a 4-4-2 from their current condition", () => {
    const career = aCareer();
    const fixture = userFixture(career);
    const aiId = fixture.homeClubId === career.userClubId ? fixture.awayClubId : fixture.homeClubId;
    const ai = career.league.clubs.find((c) => c.id === aiId) as { playerIds: string[] };
    const tired = {
      ...career,
      condition: {
        ...career.condition,
        ...Object.fromEntries(ai.playerIds.map((id) => [id, { fitness: 20, form: 5 }])),
      },
    };
    const side = fixture.homeClubId === aiId ? "home" : "away";
    const passingOf = (input: ReturnType<typeof matchInputFor>) =>
      input[side].starters.reduce((sum, p) => sum + p.attributes.passing, 0);

    expect(passingOf(matchInputFor(tired, fixture))).toBeLessThan(
      passingOf(matchInputFor(career, fixture)),
    );
  });

  it("builds valid inputs for every fixture of the first matchday", () => {
    const career = aCareer(3);
    for (const fixture of career.season.fixtures.filter((f) => f.matchday === 1)) {
      expect(validateMatchInput(matchInputFor(career, fixture))).toEqual({ ok: true });
    }
  });

  it("throws for a fixture with an unknown club", () => {
    const career = aCareer();
    const fixture = { id: "x", matchday: 1, homeClubId: "nope", awayClubId: "nada" };

    expect(() => matchInputFor(career, fixture)).toThrow(RangeError);
  });
});
