import { describe, expect, it } from "vitest";
import { autoPickLineup } from "./auto-pick-lineup";
import type { Career } from "./career";
import { aCareer, deepFreeze } from "./career-builders";
import { parseCareer } from "./parse-career";
import { playMatchdays, playSeasons } from "./season-test-helpers";

const userSquad = (c: Career) => {
  const club = c.league.clubs.find((x) => x.id === c.userClubId);
  return c.league.players.filter((p) => club?.playerIds.includes(p.id));
};

const roundTrip = (career: Career): unknown => JSON.parse(JSON.stringify(career));

const mutated = (change: (c: Career) => void): unknown => {
  const copy = roundTrip(aCareer()) as Career;
  change(copy);
  return copy;
};

const errorOf = (raw: unknown): string | undefined => {
  const result = parseCareer(raw);
  return result.ok ? undefined : result.error;
};

describe("parseCareer accepts", () => {
  it("a freshly created career", () => {
    const career = aCareer();
    expect(parseCareer(roundTrip(career))).toEqual({ ok: true, career });
  });

  it("a career after some matchdays", () => {
    const career = playMatchdays(aCareer(), 5);
    expect(parseCareer(roundTrip(career))).toEqual({ ok: true, career });
  });

  it("a career with a finished season", () => {
    const career = playMatchdays(aCareer(), 26);
    expect(parseCareer(roundTrip(career))).toEqual({ ok: true, career });
  });

  it("a career in its second season", () => {
    const career = playSeasons(aCareer(), 2, 3);
    expect(career.history).toHaveLength(1);
    expect(parseCareer(roundTrip(career))).toEqual({ ok: true, career });
  });

  it("a frozen input", () => {
    const career = deepFreeze(roundTrip(aCareer()));
    expect(parseCareer(career).ok).toBe(true);
  });
});

describe("parseCareer result", () => {
  it("is a structural copy that shares nothing with the input", () => {
    const raw = roundTrip(aCareer()) as Career;
    const result = parseCareer(raw);
    if (!result.ok) throw new Error(result.error);
    expect(result.career).not.toBe(raw);
    expect(result.career.league).not.toBe(raw.league);
    expect(result.career.league.players[0]).not.toBe(raw.league.players[0]);
    expect(result.career.season.fixtures).not.toBe(raw.season.fixtures);
  });

  it("drops unknown extra fields", () => {
    const raw = mutated((c) => {
      (c as Record<string, unknown>).extra = 1;
    });
    const result = parseCareer(raw);
    expect(result.ok && "extra" in result.career).toBe(false);
  });
});

describe("parseCareer rejects", () => {
  it.each([
    ["null", null],
    ["a number", 42],
    ["a string", "career"],
    ["an array", []],
    ["undefined", undefined],
    ["a boolean", true],
  ])("%s as not-an-object", (_name, raw) => {
    expect(errorOf(raw)).toBe("not-an-object");
  });

  it("a missing or non-integer seed", () => {
    expect(errorOf(mutated((c) => delete (c as Partial<Career>).seed))).toBe("invalid-seed");
    expect(errorOf(mutated((c) => (c.seed = 1.5)))).toBe("invalid-seed");
    expect(errorOf(mutated((c) => ((c as { seed: unknown }).seed = "1")))).toBe("invalid-seed");
  });

  it("a missing league", () => {
    expect(errorOf(mutated((c) => delete (c as Partial<Career>).league))).toBe("invalid-league");
  });

  it("an attribute out of range", () => {
    expect(errorOf(mutated((c) => ((c.league.players[0] as { pace: number }).pace = 21)))).toBe(
      "invalid-league",
    );
    expect(errorOf(mutated((c) => ((c.league.players[0] as { pace: number }).pace = 0)))).toBe(
      "invalid-league",
    );
  });

  it("a non-integer attribute", () => {
    expect(errorOf(mutated((c) => ((c.league.players[0] as { pace: number }).pace = 10.5)))).toBe(
      "invalid-league",
    );
  });

  it("a missing attribute", () => {
    expect(
      errorOf(mutated((c) => delete (c.league.players[0] as Partial<{ pace: number }>).pace)),
    ).toBe("invalid-league");
  });

  it("a player with an unknown position", () => {
    expect(
      errorOf(mutated((c) => ((c.league.players[0] as { position: string }).position = "WING"))),
    ).toBe("invalid-league");
  });

  it("a club that references an unknown player", () => {
    expect(
      errorOf(
        mutated((c) => ((c.league.clubs[0] as { playerIds: string[] }).playerIds[0] = "nobody")),
      ),
    ).toBe("invalid-league");
  });

  it("duplicate club ids", () => {
    expect(
      errorOf(
        mutated((c) => {
          (c.league.clubs[1] as { id: string }).id = (c.league.clubs[0] as { id: string }).id;
        }),
      ),
    ).toBe("invalid-league");
  });

  it("a club with wrongly typed colours", () => {
    expect(
      errorOf(mutated((c) => ((c.league.clubs[0] as { colours: unknown }).colours = "red"))),
    ).toBe("invalid-league");
  });

  it("a user club that is not in the league", () => {
    expect(errorOf(mutated((c) => (c.userClubId = "ghost")))).toBe("unknown-user-club");
    expect(errorOf(mutated((c) => ((c as { userClubId: unknown }).userClubId = 3)))).toBe(
      "unknown-user-club",
    );
  });

  it("fixtures that reference unknown clubs", () => {
    expect(
      errorOf(
        mutated((c) => ((c.season.fixtures[0] as { homeClubId: string }).homeClubId = "ghost")),
      ),
    ).toBe("invalid-season");
  });

  it("a club that plays itself", () => {
    expect(
      errorOf(
        mutated((c) => {
          const f = c.season.fixtures[0] as { homeClubId: string; awayClubId: string };
          f.awayClubId = f.homeClubId;
        }),
      ),
    ).toBe("invalid-season");
  });

  it("duplicate fixture ids", () => {
    expect(
      errorOf(
        mutated(
          (c) =>
            ((c.season.fixtures[1] as { id: string }).id = (
              c.season.fixtures[0] as { id: string }
            ).id),
        ),
      ),
    ).toBe("invalid-season");
  });

  it("a wrongly typed season", () => {
    expect(errorOf(mutated((c) => ((c as { season: unknown }).season = null)))).toBe(
      "invalid-season",
    );
    expect(errorOf(mutated((c) => (c.season.fixtures = [])))).toBe("invalid-season");
    expect(errorOf(mutated((c) => (c.season.number = 0)))).toBe("invalid-season");
  });

  it("a current matchday out of range", () => {
    expect(errorOf(mutated((c) => (c.season.currentMatchday = 0)))).toBe("invalid-season");
    expect(errorOf(mutated((c) => (c.season.currentMatchday = 28)))).toBe("invalid-season");
  });

  it("a current matchday that does not match the stored results", () => {
    expect(errorOf(mutated((c) => (c.season.currentMatchday = 3)))).toBe("inconsistent-results");
    const played = roundTrip(playMatchdays(aCareer(), 3)) as Career;
    played.season.results.pop();
    expect(errorOf(played)).toBe("inconsistent-results");
  });

  it("a result that does not match its fixture", () => {
    const played = roundTrip(playMatchdays(aCareer(), 2)) as Career;
    (played.season.results[0] as { fixtureId: string }).fixtureId = "other";
    expect(errorOf(played)).toBe("inconsistent-results");
    const swapped = roundTrip(playMatchdays(aCareer(), 2)) as Career;
    (swapped.season.results[0] as { homeClubId: string }).homeClubId = (
      swapped.season.results[0] as { awayClubId: string }
    ).awayClubId;
    expect(errorOf(swapped)).toBe("inconsistent-results");
  });

  it("negative or fractional goals", () => {
    const played = roundTrip(playMatchdays(aCareer(), 1)) as Career;
    (played.season.results[0] as { homeGoals: number }).homeGoals = -1;
    expect(errorOf(played)).toBe("invalid-season");
    (played.season.results[0] as { homeGoals: number }).homeGoals = 1.5;
    expect(errorOf(played)).toBe("invalid-season");
  });

  it("a malformed history", () => {
    expect(errorOf(mutated((c) => ((c as { history: unknown }).history = {})))).toBe(
      "invalid-history",
    );
    expect(errorOf(mutated((c) => ((c as { history: unknown }).history = [1])))).toBe(
      "invalid-history",
    );
    const later = roundTrip(playSeasons(aCareer(), 2, 1)) as Career;
    (later.history[0] as { championId: string }).championId = "ghost";
    expect(errorOf(later)).toBe("invalid-history");
    const noTable = roundTrip(playSeasons(aCareer(), 2, 1)) as Career;
    (noTable.history[0] as { finalTable: unknown }).finalTable = [{ clubId: "x" }];
    expect(errorOf(noTable)).toBe("invalid-history");
    const noScorer = roundTrip(playSeasons(aCareer(), 2, 1)) as Career;
    (noScorer.history[0] as { topScorers: unknown }).topScorers = [{ name: 1 }];
    expect(errorOf(noScorer)).toBe("invalid-history");
  });
});

describe("parseCareer never throws", () => {
  const deep = (depth: number): unknown => {
    let value: unknown = {};
    for (let i = 0; i < depth; i++) value = { league: value, season: [value], history: [value] };
    return value;
  };
  const throwingGetter = {
    get seed(): number {
      throw new Error("boom");
    },
  };
  const hostile: unknown[] = [
    null,
    undefined,
    0,
    NaN,
    Number.POSITIVE_INFINITY,
    "",
    [],
    [[[]]],
    {},
    { league: [] },
    { seed: 1, league: { clubs: "x", players: 3 } },
    deep(2000),
    throwingGetter,
    new Map(),
    () => 1,
    Symbol("s"),
    { seed: 1, league: { id: "a", name: "b", clubs: [null], players: [undefined] } },
    JSON.parse('{"__proto__": {"seed": 1}}'),
  ];

  it.each(hostile.map((value, i) => [i, value] as const))("hostile value %i", (_i, value) => {
    expect(() => parseCareer(value)).not.toThrow();
    expect(parseCareer(value).ok).toBe(false);
  });
});

describe("Career JSON safety", () => {
  const unsafe = (value: unknown, path = "career"): string[] => {
    if (value === undefined) return [`${path} is undefined`];
    if (typeof value === "number") return Number.isFinite(value) ? [] : [`${path} is not finite`];
    if (value === null || typeof value === "string" || typeof value === "boolean") return [];
    if (typeof value !== "object") return [`${path} is a ${typeof value}`];
    const proto = Object.getPrototypeOf(value);
    if (!Array.isArray(value) && proto !== Object.prototype) return [`${path} is a class instance`];
    return Object.entries(value).flatMap(([key, child]) => unsafe(child, `${path}.${key}`));
  };

  it.each([
    ["new", aCareer()],
    ["mid-season", playMatchdays(aCareer(), 4)],
    ["second season", playSeasons(aCareer(), 2, 2)],
  ])("a %s career contains only JSON-safe values", (_name, career) => {
    expect(unsafe(career)).toEqual([]);
    expect(JSON.parse(JSON.stringify(career))).toEqual(career);
  });
});

describe("parseCareer squad plan and condition", () => {
  const clubPlayerIds = (c: Career, clubId: string): string[] =>
    (c.league.clubs.find((club) => club.id === clubId) as { playerIds: string[] }).playerIds;

  const reject = (change: (c: Career) => void, error: string): void => {
    expect(errorOf(mutated(change))).toBe(error);
  };

  it("accepts a career with a non-default plan", () => {
    const career = {
      ...aCareer(),
      squadPlan: {
        ...autoPickLineup(userSquad(aCareer()), "3-4-3"),
        tactics: { mentality: "attacking", pressing: "high", width: "wide", tempo: "fast" },
      },
    } as Career;
    expect(parseCareer(roundTrip(career))).toEqual({ ok: true, career });
  });

  it("rejects starters that do not fit the formation", () => {
    reject((c) => {
      c.squadPlan.formation = "3-4-3";
    }, "invalid-squad-plan");
  });

  it("rejects a bench of the wrong size", () => {
    reject((c) => {
      c.squadPlan.bench = c.squadPlan.bench.slice(1);
    }, "invalid-squad-plan");
  });

  it("rejects duplicate ids", () => {
    reject((c) => {
      c.squadPlan.bench[0] = c.squadPlan.starters[0] as string;
    }, "invalid-squad-plan");
  });

  it("rejects unknown ids", () => {
    reject((c) => {
      c.squadPlan.starters[0] = "nobody";
    }, "invalid-squad-plan");
  });

  it("rejects a player from another club", () => {
    reject((c) => {
      const other = c.league.clubs.find((club) => club.id !== c.userClubId) as { id: string };
      c.squadPlan.starters[0] = clubPlayerIds(c, other.id)[0] as string;
    }, "invalid-squad-plan");
  });

  it("rejects unknown tactics values", () => {
    reject((c) => {
      (c.squadPlan.tactics as { mentality: string }).mentality = "reckless";
    }, "invalid-squad-plan");
  });

  it("rejects a missing plan", () => {
    reject((c) => {
      delete (c as { squadPlan?: unknown }).squadPlan;
    }, "invalid-squad-plan");
  });

  it("rejects fitness outside 0..100", () => {
    reject((c) => {
      (Object.values(c.condition)[0] as { fitness: number }).fitness = 101;
    }, "invalid-condition");
    reject((c) => {
      (Object.values(c.condition)[0] as { fitness: number }).fitness = -1;
    }, "invalid-condition");
  });

  it("rejects form outside 1..10", () => {
    reject((c) => {
      (Object.values(c.condition)[0] as { form: number }).form = 11;
    }, "invalid-condition");
    reject((c) => {
      (Object.values(c.condition)[0] as { form: number }).form = 0;
    }, "invalid-condition");
  });

  it("rejects a missing condition for a player", () => {
    reject((c) => {
      delete c.condition[c.league.players[0]?.id as string];
    }, "invalid-condition");
  });

  it("rejects a condition for an unknown player", () => {
    reject((c) => {
      c.condition.nobody = { fitness: 100, form: 5 };
    }, "invalid-condition");
  });

  it("rejects a missing condition record", () => {
    reject((c) => {
      delete (c as { condition?: unknown }).condition;
    }, "invalid-condition");
  });
});
