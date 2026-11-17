import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { createActionMatch, NEUTRAL_TACTICS } from "../engine";
import type { Career } from "./career";
import { aCareer, deepFreeze } from "./career-builders";
import type { Fixture } from "./generate-fixtures";
import { matchInputFor, matchSeed } from "./match-input-for";
import {
  EMPTY_MATCH_CHANGES,
  MAX_SUBSTITUTION_WINDOWS,
  MAX_SUBSTITUTIONS,
  type MatchChange,
  type MatchChanges,
  type PlannedChange,
  planChange,
} from "./plan-change";
import type { Player } from "./player";
import type { PlayerPosition } from "./squad-player";

const userFixtureOf = (career: Career): Fixture =>
  career.season.fixtures.find(
    (f) => f.homeClubId === career.userClubId || f.awayClubId === career.userClubId,
  ) as Fixture;

const positionOf = (career: Career, id: string): PlayerPosition =>
  (career.league.players.find((p) => p.id === id) as Player).position;

/** `count` outfield substitutions: the nth outfield starter off, the nth outfield bench player on. */
const pairs = (career: Career, count: number) => {
  const { starters, bench } = career.squadPlan;
  const off = starters.filter((id) => positionOf(career, id) !== "GK");
  const on = bench.filter((id) => positionOf(career, id) !== "GK");
  return off.slice(0, count).map((id, n) => ({ off: id, on: on[n] as string }));
};

const planned = (
  career: Career,
  minute: number,
  change: Omit<MatchChange, "minute">,
  previous?: MatchChanges,
): PlannedChange => {
  const result = planChange(career, userFixtureOf(career), { ...change, minute }, { previous });
  if (!result.ok) throw new Error(result.error);
  return result;
};

const error = (
  career: Career,
  minute: number,
  change: Omit<MatchChange, "minute">,
  previous?: MatchChanges,
) => {
  const result = planChange(career, userFixtureOf(career), { ...change, minute }, { previous });
  return result.ok ? undefined : result.error;
};

describe("planChange", () => {
  it("gives the unchanged lineup, the plan's tactics and 90 minutes to the starters for an empty change", () => {
    const career = deepFreeze(aCareer());
    const fixture = userFixtureOf(career);
    const input = matchInputFor(career, fixture);
    const side = fixture.homeClubId === career.userClubId ? "home" : "away";

    const result = planned(career, 30, {});

    expect(result.change).toEqual({
      side,
      lineup: input[side].starters,
      tactics: input[side].tactics,
    });
    for (const id of career.squadPlan.starters) expect(result.report.minutes[id]).toBe(90);
    for (const id of career.squadPlan.bench) expect(result.report.minutes[id]).toBe(0);
    expect(result.report.fatigue).toEqual({});
  });

  it("splits the minutes at the minute of the substitution", () => {
    const career = aCareer();
    const [swap] = pairs(career, 1) as [{ off: string; on: string }];

    const { report } = planned(career, 60, { substitutions: [swap] });

    expect(report.minutes[swap.off]).toBe(60);
    expect(report.minutes[swap.on]).toBe(30);
  });

  it("lets a substitute be replaced again, which uses another substitution", () => {
    const career = aCareer();
    const [first, second] = pairs(career, 2) as [
      { off: string; on: string },
      { off: string; on: string },
    ];
    const one = planned(career, 30, { substitutions: [first] });

    const two = planned(
      career,
      70,
      { substitutions: [{ off: first.on, on: second.on }] },
      one.changes,
    );

    expect(two.report.minutes[first.off]).toBe(30);
    expect(two.report.minutes[first.on]).toBe(40);
    expect(two.report.minutes[second.on]).toBe(20);
    expect(two.changes.substitutions).toHaveLength(2);
  });

  it("lets a bench player take any position and rates him there", () => {
    const career = aCareer();
    const { starters, bench } = career.squadPlan;
    const defender = starters.find((id) => positionOf(career, id) === "DEF") as string;
    const forward = bench.find((id) => positionOf(career, id) === "FWD") as string;

    const { change } = planned(career, 50, { substitutions: [{ off: defender, on: forward }] });

    const playing = change.lineup?.find((p) => p.id === forward);
    expect(playing?.position).toBe("DEF");
    expect(change.lineup).toHaveLength(11);
    expect(change.lineup?.filter((p) => p.position === "DEF")).toHaveLength(4);
  });

  it("keeps the position of the player replaced for the next substitute", () => {
    const career = aCareer();
    const { starters, bench } = career.squadPlan;
    const defender = starters.find((id) => positionOf(career, id) === "DEF") as string;
    const [a, b] = bench.filter((id) => positionOf(career, id) === "FWD") as [string, string];
    const one = planned(career, 20, { substitutions: [{ off: defender, on: a }] });

    const two = planned(career, 40, { substitutions: [{ off: a, on: b }] }, one.changes);

    expect(two.change.lineup?.find((p) => p.id === b)?.position).toBe("DEF");
  });

  it("allows a goalkeeper to replace a defender", () => {
    const career = aCareer();
    const { starters, bench } = career.squadPlan;
    const defender = starters.find((id) => positionOf(career, id) === "DEF") as string;
    const keeper = bench.find((id) => positionOf(career, id) === "GK") as string;

    const { change } = planned(career, 50, { substitutions: [{ off: defender, on: keeper }] });

    expect(change.lineup?.filter((p) => p.position === "GK")).toHaveLength(1);
  });

  it("never lets a player substituted off return", () => {
    const career = aCareer();
    const [swap] = pairs(career, 1) as [{ off: string; on: string }];
    const one = planned(career, 30, { substitutions: [swap] });

    expect(
      error(career, 60, { substitutions: [{ off: swap.on, on: swap.off }] }, one.changes),
    ).toBe("player-not-on-bench");
  });

  it("refuses more than five substitutions in all", () => {
    const career = aCareer();
    const all = pairs(career, 6);
    const one = planned(career, 30, { substitutions: all.slice(0, 3) });

    expect(error(career, 30, { substitutions: all.slice(3, 6) }, one.changes)).toBe(
      "too-many-substitutions",
    );
    expect(MAX_SUBSTITUTIONS).toBe(5);
  });

  it("allows three windows besides half-time and refuses a fourth", () => {
    const career = aCareer();
    const all = pairs(career, 5);
    let changes = EMPTY_MATCH_CHANGES;
    for (const [n, minute] of [30, 60, 75].entries()) {
      changes = planned(career, minute, { substitutions: [all[n] as never] }, changes).changes;
    }

    expect(MAX_SUBSTITUTION_WINDOWS).toBe(3);
    expect(error(career, 85, { substitutions: [all[3] as never] }, changes)).toBe(
      "too-many-windows",
    );
  });

  it("does not count half-time or a second change in the same window as another window", () => {
    const career = aCareer();
    const all = pairs(career, 5);
    let changes = planned(career, 45, { substitutions: [all[0] as never], halfTime: true }).changes;
    changes = planned(career, 60, { substitutions: [all[1] as never] }, changes).changes;
    changes = planned(career, 60, { substitutions: [all[2] as never] }, changes).changes;
    changes = planned(career, 70, { substitutions: [all[3] as never] }, changes).changes;
    changes = planned(career, 80, { substitutions: [all[4] as never] }, changes).changes;

    expect(changes.substitutions).toHaveLength(5);
  });

  it("refuses duplicates, players not on the pitch and players not on the bench", () => {
    const career = aCareer();
    const [a, b] = pairs(career, 2) as [{ off: string; on: string }, { off: string; on: string }];

    expect(error(career, 30, { substitutions: [a, { off: a.off, on: b.on }] })).toBe(
      "duplicate-substitution",
    );
    expect(error(career, 30, { substitutions: [{ off: a.on, on: b.on }] })).toBe(
      "player-not-on-pitch",
    );
    expect(error(career, 30, { substitutions: [{ off: a.off, on: b.off }] })).toBe(
      "player-not-on-bench",
    );
  });

  it("refuses a minute out of range and a change before the last one", () => {
    const career = aCareer();
    const [swap] = pairs(career, 1) as [{ off: string; on: string }];
    const one = planned(career, 50, { substitutions: [swap] });

    expect(error(career, -1, {})).toBe("minute-out-of-range");
    expect(error(career, Number.NaN, {})).toBe("minute-out-of-range");
    expect(error(career, 49, {}, one.changes)).toBe("change-in-the-past");
  });

  it("sets new base tactics and keeps them for later changes", () => {
    const career = aCareer();
    const attacking = { ...NEUTRAL_TACTICS, mentality: "attacking" as const };
    const one = planned(career, 30, { tactics: attacking });

    const two = planned(career, 60, {}, one.changes);

    expect(one.change.tactics).toEqual(attacking);
    expect(two.change.tactics).toEqual(attacking);
  });

  describe("shouts", () => {
    it("puts the shout on top of the base tactics while it lasts and takes it off afterwards", () => {
      const career = aCareer();
      const one = planned(career, 20, { shout: "pushUp" });

      const during = planned(career, 25, {}, one.changes);
      const after = planned(career, 30, {}, one.changes);

      expect(one.change.tactics?.mentality).toBe("attacking");
      expect(during.change.tactics?.pressing).toBe(career.squadPlan.tactics.pressing);
      expect(after.change.tactics).toEqual(career.squadPlan.tactics);
    });

    it("refuses a second shout during the first and in the cooldown", () => {
      const career = aCareer();
      const one = planned(career, 20, { shout: "pushUp" });

      expect(error(career, 25, { shout: "calmDown" }, one.changes)).toBe("shout-active");
      expect(error(career, 35, { shout: "calmDown" }, one.changes)).toBe("shout-cooling-down");
      expect(error(career, 40, { shout: "calmDown" }, one.changes)).toBeUndefined();
    });

    it("costs fatigue for the players on the pitch while a raising shout lasts", () => {
      const career = aCareer();
      const [swap] = pairs(career, 1) as [{ off: string; on: string }];
      const one = planned(career, 20, { shout: "pushUp" });

      const two = planned(career, 25, { substitutions: [swap] }, one.changes);

      expect(two.report.fatigue?.[swap.off]).toBeCloseTo(0.25);
      expect(two.report.fatigue?.[swap.on]).toBeCloseTo(0.25);
      const stayer = career.squadPlan.starters.find((id) => id !== swap.off) as string;
      expect(two.report.fatigue?.[stayer]).toBeCloseTo(0.5);
    });

    it("gives no fatigue for a shout that calms the team down", () => {
      const career = aCareer();

      const result = planned(career, 20, { shout: "calmDown" });

      expect(result.report.fatigue).toEqual({});
    });
  });

  it("does not change the career", () => {
    const career = deepFreeze(aCareer());
    const [swap] = pairs(career, 1) as [{ off: string; on: string }];

    expect(() => planned(career, 40, { substitutions: [swap], shout: "pushUp" })).not.toThrow();
  });

  it("throws for a fixture without the user's club", () => {
    const career = aCareer();
    const other = career.season.fixtures.find(
      (f) => f.homeClubId !== career.userClubId && f.awayClubId !== career.userClubId,
    ) as Fixture;

    expect(() => planChange(career, other, { minute: 30 })).toThrow(RangeError);
  });

  it("gives the same match whenever the change is applied in the engine, split any way", () => {
    const career = aCareer();
    const fixture = userFixtureOf(career);
    const [swap] = pairs(career, 1) as [{ off: string; on: string }];
    const result = planned(career, 60, { substitutions: [swap], shout: "pushUp" });
    const play = (steps: number[]) => {
      const match = createActionMatch(matchInputFor(career, fixture), matchSeed(career, fixture), {
        detail: "fast",
      });
      let at = 0;
      for (const step of steps) {
        at += step;
        match.advanceTo(Math.min(at, 3600));
      }
      match.advanceTo(3600);
      expect(match.applyChange(result.change)).toEqual({ ok: true });
      match.advanceTo(4000);
      match.resume();
      match.advanceTo(9000);
      return match.events;
    };

    expect(play([])).toEqual(play([7, 130, 1000]));
  });
});

describe("planChange minutes (property)", () => {
  const career = aCareer();
  const swaps = pairs(career, 3);
  const arbMinutes = fc.array(fc.integer({ min: 0, max: 90 }), { minLength: 1, maxLength: 3 });

  const planAll = (minutes: readonly number[]) => {
    let changes = EMPTY_MATCH_CHANGES;
    for (const [n, minute] of minutes.entries()) {
      changes = planned(career, minute, { substitutions: [swaps[n] as never] }, changes).changes;
    }
    return planned(career, 90, {}, changes).report.minutes;
  };

  it("gives every substitute and substituted-off player the time on the pitch", () => {
    fc.assert(
      fc.property(arbMinutes, (minutes) => {
        const sorted = [...minutes].sort((a, b) => a - b);
        const played = planAll(sorted);
        return sorted.every(
          (minute, n) =>
            played[swaps[n]?.off as string] === minute &&
            played[swaps[n]?.on as string] === 90 - minute,
        );
      }),
      { numRuns: 100 },
    );
  });

  it("always has eleven players on the pitch, so the minutes add up to 990", () => {
    fc.assert(
      fc.property(arbMinutes, (minutes) => {
        const played = planAll([...minutes].sort((a, b) => a - b));
        return Object.values(played).reduce((a, b) => a + b, 0) === 11 * 90;
      }),
      { numRuns: 100 },
    );
  });
});
