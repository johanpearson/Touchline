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

  it.each([0, 1, 3, "2", null, undefined])("rejects engineVersion %j", (value) => {
    reject((c) => {
      (c as { engineVersion: unknown }).engineVersion = value;
    }, "invalid-engine-version");
  });

  it("rejects a result without a valid engineVersion", () => {
    const played = playMatchdays(aCareer(), 1);
    const raw = roundTrip(played) as Career;
    (raw.season.results[0] as { engineVersion: unknown }).engineVersion = 7;
    expect(errorOf(raw)).toBe("invalid-season");
  });

  it("keeps careers and results", () => {
    const played = playMatchdays(aCareer(), 1);
    expect(parseCareer(roundTrip(played))).toEqual({ ok: true, career: played });
  });
});

describe("parseCareer scorers", () => {
  const played = () => roundTrip(playMatchdays(aCareer(), 2)) as Career;
  const withGoals = (c: Career) => {
    const result = c.season.results.find((r) => r.homeGoals > 0 && r.awayGoals > 0);
    if (!result) throw new Error("no result with goals from both sides");
    return result;
  };
  const playersOf = (c: Career, clubId: string) =>
    c.league.clubs.find((x) => x.id === clubId)?.playerIds ?? [];
  const change = (edit: (c: Career, r: Career["season"]["results"][number]) => void): unknown => {
    const copy = played();
    edit(copy, withGoals(copy));
    return copy;
  };

  it("keeps recorded scorers", () => {
    const career = playMatchdays(aCareer(), 2);
    const parsed = parseCareer(roundTrip(career));
    expect(parsed.ok && parsed.career.season.results.some((r) => r.scorers?.length)).toBe(true);
  });

  it("accepts results without scorers (saves from before schema v6)", () => {
    const raw = change((_c, r) => {
      delete r.scorers;
    });
    expect(errorOf(raw)).toBeUndefined();
  });

  it.each([
    ["not a list", "x"],
    ["a list with a non-string", [1]],
  ])("rejects scorers that are %s", (_name, value) => {
    expect(
      errorOf(
        change((_c, r) => {
          r.scorers = value as never;
        }),
      ),
    ).toBe("invalid-season");
  });

  it("rejects a scorer that plays for neither club of the match", () => {
    const raw = change((c, r) => {
      const outsider = c.league.clubs.find((x) => x.id !== r.homeClubId && x.id !== r.awayClubId)
        ?.playerIds[0] as string;
      r.scorers = [outsider, ...(r.scorers ?? []).slice(1)];
    });
    expect(errorOf(raw)).toBe("invalid-season");
  });

  it("rejects scorers that do not add up to the goals of each club", () => {
    const raw = change((c, r) => {
      const home = playersOf(c, r.homeClubId)[0] as string;
      r.scorers = Array.from({ length: r.homeGoals + r.awayGoals }, () => home);
    });
    expect(errorOf(raw)).toBe("invalid-season");
  });

  it("rejects a list that is shorter than the goals scored", () => {
    const raw = change((_c, r) => {
      r.scorers = (r.scorers ?? []).slice(1);
    });
    expect(errorOf(raw)).toBe("invalid-season");
  });
});

describe("parseCareer rejects the schema v7 data when", () => {
  const firstPlayerId = (c: Career): string => c.league.players[0]?.id ?? "";

  it("a potential is outside 1 to 20", () => {
    expect(
      errorOf(
        mutated((c) => {
          (c.league.players[0] as { potential: number }).potential = 21;
        }),
      ),
    ).toBe("invalid-league");
    expect(
      errorOf(
        mutated((c) => {
          (c.league.players[0] as { potential: number }).potential = 0;
        }),
      ),
    ).toBe("invalid-league");
  });

  it("a potential is below the overall", () => {
    const raw = mutated((c) => {
      const player = c.league.players[0] as unknown as Record<string, number>;
      for (const key of [
        "handling",
        "reflexes",
        "tackling",
        "positioning",
        "strength",
        "passing",
        "vision",
        "ballControl",
        "workRate",
        "finishing",
        "pace",
        "dribbling",
      ])
        player[key] = 20;
      player.potential = 19;
    });
    expect(errorOf(raw)).toBe("invalid-league");
  });

  it("a potential is missing", () => {
    const raw = mutated((c) => {
      delete (c.league.players[0] as { potential?: number }).potential;
    });
    expect(errorOf(raw)).toBe("invalid-league");
  });

  it("a contract belongs to an unknown player", () => {
    expect(
      errorOf(
        mutated((c) => {
          c.contracts.ghost = { wage: 1, expiresSeason: 1 };
        }),
      ),
    ).toBe("invalid-contracts");
  });

  it("a club player has no contract", () => {
    expect(
      errorOf(
        mutated((c) => {
          delete c.contracts[firstPlayerId(c)];
        }),
      ),
    ).toBe("invalid-contracts");
  });

  it("a contract is malformed", () => {
    expect(
      errorOf(
        mutated((c) => {
          c.contracts[firstPlayerId(c)] = { wage: -1, expiresSeason: 1 };
        }),
      ),
    ).toBe("invalid-contracts");
    expect(
      errorOf(
        mutated((c) => {
          c.contracts[firstPlayerId(c)] = { wage: 1, expiresSeason: 0 };
        }),
      ),
    ).toBe("invalid-contracts");
  });

  it("a finance belongs to an unknown club", () => {
    expect(
      errorOf(
        mutated((c) => {
          c.finances.ghost = { balance: 0, baseIncome: 1 };
        }),
      ),
    ).toBe("invalid-finances");
  });

  it("a club has no finance", () => {
    expect(
      errorOf(
        mutated((c) => {
          delete c.finances[c.userClubId];
        }),
      ),
    ).toBe("invalid-finances");
  });

  it("a finance is malformed", () => {
    expect(
      errorOf(
        mutated((c) => {
          c.finances[c.userClubId] = { balance: 0.5, baseIncome: 1 };
        }),
      ),
    ).toBe("invalid-finances");
    expect(
      errorOf(
        mutated((c) => {
          c.finances[c.userClubId] = { balance: 0, baseIncome: -1 };
        }),
      ),
    ).toBe("invalid-finances");
  });

  it("a free agent is also in a club", () => {
    expect(
      errorOf(
        mutated((c) => {
          c.freeAgentIds = [firstPlayerId(c)];
        }),
      ),
    ).toBe("invalid-free-agents");
  });

  it("a free agent is unknown or listed twice", () => {
    expect(
      errorOf(
        mutated((c) => {
          c.freeAgentIds = ["ghost"];
        }),
      ),
    ).toBe("invalid-free-agents");
  });

  it("a free agent is listed twice", () => {
    const raw = mutated((c) => {
      const id = c.league.clubs[1]?.playerIds.pop() ?? "";
      c.freeAgentIds = [id, id];
    });
    expect(errorOf(raw)).toBe("invalid-free-agents");
  });

  it("minutes are negative or belong to an unknown player", () => {
    expect(
      errorOf(
        mutated((c) => {
          c.minutes[firstPlayerId(c)] = -1;
        }),
      ),
    ).toBe("invalid-minutes");
    expect(
      errorOf(
        mutated((c) => {
          c.minutes.ghost = 0;
        }),
      ),
    ).toBe("invalid-minutes");
  });

  it("any of the new fields is missing", () => {
    expect(
      errorOf(
        mutated((c) => {
          delete (c as Partial<Career>).minutes;
        }),
      ),
    ).toBe("invalid-minutes");
    expect(
      errorOf(
        mutated((c) => {
          delete (c as Partial<Career>).freeAgentIds;
        }),
      ),
    ).toBe("invalid-free-agents");
  });

  it("accepts a player without a club as a free agent without a contract", () => {
    const raw = mutated((c) => {
      const club = c.league.clubs[1];
      const id = club?.playerIds.pop() ?? "";
      delete c.contracts[id];
      c.freeAgentIds = [id];
    });
    expect(errorOf(raw)).toBeUndefined();
  });
});

describe("parseCareer and the last development (schema v7, optional)", () => {
  const withChange = (change: unknown): unknown =>
    mutated((c) => {
      const id = c.league.players[0]?.id ?? "";
      (c as Record<string, unknown>).lastDevelopment = [
        { playerId: id, attribute: "pace", before: 10, after: 11, ...(change as object) },
      ];
    });

  it("keeps a valid change list", () => {
    const raw = withChange({});
    const result = parseCareer(raw);
    expect(result.ok && result.career.lastDevelopment).toEqual(
      (raw as { lastDevelopment: unknown }).lastDevelopment,
    );
  });

  it("leaves it out of a save that has none", () => {
    const result = parseCareer(roundTrip(aCareer()));
    expect(result.ok && "lastDevelopment" in result.career).toBe(false);
  });

  it("rejects an unknown player, attribute or out-of-range value", () => {
    for (const bad of [
      { playerId: "ghost" },
      { attribute: "luck" },
      { after: 21 },
      { before: 0 },
    ]) {
      expect(errorOf(withChange(bad))).toBe("invalid-development");
    }
  });

  it("rejects a value that is not a list", () => {
    expect(
      errorOf(
        mutated((c) => {
          (c as Record<string, unknown>).lastDevelopment = "no";
        }),
      ),
    ).toBe("invalid-development");
  });
});
