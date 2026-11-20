import { describe, expect, it } from "vitest";
import type { ActionMatch, ActionMatchChange, TimedActionMatchChange } from "../engine";
import { aCareer } from "./career-builders";
import { createCoachedMatch } from "./coached-match";
import type { Fixture } from "./generate-fixtures";
import { identityOf, type MatchSession } from "./match-session";
import { planChange } from "./plan-change";
import { playToFullTime, resumeMatch } from "./resume-match";

const career = aCareer(7);
const fixture = career.season.fixtures.find(
  (f) => f.homeClubId === career.userClubId || f.awayClubId === career.userClubId,
) as Fixture;
const userSide = fixture.homeClubId === career.userClubId ? "home" : "away";
const END = 1_000_000;

const change: ActionMatchChange = {
  side: userSide,
  tactics: { mentality: "attacking", pressing: "high", tempo: "fast", width: "wide" },
};

const create = (): ActionMatch => createCoachedMatch(career, fixture);

/** The match played without a stop: the user's change at half-time, then on to full time. */
const uninterrupted = (): ActionMatch => {
  const match = create();
  match.advanceTo(END);
  match.applyChange(change);
  match.resume();
  match.advanceTo(END);
  return match;
};

/** The session of a match saved at `matchTime`: the change exists once half-time has been reached. */
const sessionAt = (matchTime: number, halfTimeTime: number, resumed: boolean): MatchSession => {
  const changes: TimedActionMatchChange[] =
    matchTime >= halfTimeTime ? [{ time: halfTimeTime, change }] : [];
  const period = matchTime < halfTimeTime ? "firstHalf" : resumed ? "secondHalf" : "halfTime";
  return {
    ...identityOf(career, fixture),
    mode: "extended",
    changes,
    position: { matchTime, period },
  };
};

const finish = (match: ActionMatch): ActionMatch => {
  match.advanceTo(END);
  if (match.state.period === "halfTime") {
    if (match.changes.length === 0 || !match.changes.some((c) => c.change.side === userSide)) {
      match.applyChange(change);
    }
    match.resume();
    match.advanceTo(END);
  }
  return match;
};

describe("resumeMatch", () => {
  const whole = uninterrupted();
  const halfTime = (() => {
    const m = create();
    m.advanceTo(END);
    return m.state.time;
  })();

  it("rebuilds the exact event log and score when split in the first half", () => {
    for (const minute of [1, 12, 30, 44]) {
      const result = resumeMatch(sessionAt(minute * 60, halfTime, false), create);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.match.state.period).toBe("firstHalf");
      const done = finish(result.match);
      expect(done.events).toEqual(whole.events);
      expect(done.state.score).toEqual(whole.state.score);
    }
  });

  it("keeps a match saved at half-time at half-time, with the change applied", () => {
    const result = resumeMatch(sessionAt(halfTime, halfTime, false), create);
    if (!result.ok) throw new Error("expected a match");
    expect(result.match.state.period).toBe("halfTime");
    expect(result.match.changes.filter((c) => c.change.side === userSide)).toHaveLength(1);
    result.match.resume();
    result.match.advanceTo(END);
    expect(result.match.events).toEqual(whole.events);
  });

  it("rebuilds the exact log when split in the second half", () => {
    for (const secondsIn of [30, 900, 1800, 2400]) {
      const result = resumeMatch(sessionAt(halfTime + secondsIn, halfTime, true), create);
      if (!result.ok) throw new Error("expected a match");
      expect(result.match.state.period).toBe("secondHalf");
      result.match.advanceTo(END);
      expect(result.match.events).toEqual(whole.events);
      expect(result.match.state.score).toEqual(whole.state.score);
    }
  });

  it("goes into the second half when saved right after the restart", () => {
    const result = resumeMatch(sessionAt(halfTime, halfTime, true), create);
    if (!result.ok) throw new Error("expected a match");
    expect(result.match.state.period).toBe("secondHalf");
  });

  it("stops at full time", () => {
    const result = resumeMatch(
      { ...sessionAt(END, halfTime, true), position: { matchTime: END, period: "fullTime" } },
      create,
    );
    if (!result.ok) throw new Error("expected a match");
    expect(result.match.state.period).toBe("fullTime");
    expect(result.match.events).toEqual(whole.events);
  });

  it("refuses a change the engine rejects instead of throwing", () => {
    const bad = { ...sessionAt(halfTime, halfTime, false) };
    bad.changes = [{ time: halfTime, change: { side: userSide, lineup: [] } }];
    expect(resumeMatch(bad, create)).toEqual({ ok: false, error: "invalid-change" });
  });
});

describe("resumeMatch with changes made in play", () => {
  const off = career.squadPlan.starters[1] as string;
  const on = career.squadPlan.bench[0] as string;
  const first = planChange(career, fixture, { minute: 20, substitutions: [{ off, on }] });
  if (!first.ok) throw new Error(first.error);
  const second = planChange(
    career,
    fixture,
    { minute: 62, shout: "pushUp" },
    { previous: first.changes },
  );
  if (!second.ok) throw new Error(second.error);

  /** The match played through without a stop: a substitution in the first half, a shout in the second. */
  const played = (() => {
    const match = create();
    match.advanceTo(20 * 60 + 5);
    const firstTime = match.state.time;
    match.applyChange(first.change);
    match.advanceTo(END);
    match.resume();
    match.advanceTo(match.state.time + 17 * 60);
    const secondTime = match.state.time;
    match.applyChange(second.change);
    match.advanceTo(END);
    return { match, firstTime, secondTime };
  })();
  const whole = played.match;
  const { firstTime, secondTime } = played;

  const session = (matchTime: number, period: "firstHalf" | "secondHalf"): MatchSession => {
    const changes: TimedActionMatchChange[] = [
      { time: firstTime, change: first.change },
      { time: secondTime, change: second.change },
    ];
    return {
      ...identityOf(career, fixture),
      mode: "extended",
      changes: changes.filter((c) => c.time <= matchTime),
      position: { matchTime, period },
    };
  };

  /** Reloads at `matchTime` and plays on to full time; the second change is made after a reload before it. */
  const reloadedAndFinished = (matchTime: number, period: "firstHalf" | "secondHalf") => {
    const result = resumeMatch(session(matchTime, period), create);
    if (!result.ok) throw new Error("expected a match");
    const { match } = result;
    if (matchTime < secondTime) playUpTo(match, secondTime).applyChange(second.change);
    match.advanceTo(END);
    return match;
  };

  /** Plays on, through half-time, to `time`. */
  const playUpTo = (match: ActionMatch, time: number): ActionMatch => {
    if (match.state.period === "firstHalf") {
      match.advanceTo(END);
      match.resume();
    }
    match.advanceTo(time);
    return match;
  };

  it.each([
    ["in the first half, after the first change", firstTime + 300, "firstHalf"],
    ["in the second half, before the second change", secondTime - 100, "secondHalf"],
    ["in the second half, after the second change", secondTime + 100, "secondHalf"],
  ] as const)("replays the same log when reloaded %s", (_name, matchTime, period) => {
    expect(reloadedAndFinished(matchTime, period).events).toEqual(whole.events);
  });
});

describe("playToFullTime", () => {
  const plain = (): ActionMatch => {
    const match = create();
    match.advanceTo(END);
    match.resume();
    match.advanceTo(END);
    return match;
  };

  it("gives the log of a match played without a stop, from kick-off", () => {
    const match = create();
    playToFullTime(match);
    expect(match.state.period).toBe("fullTime");
    expect(match.events).toEqual(plain().events);
  });

  it("starts the second half of a match waiting at half-time", () => {
    const match = create();
    match.advanceTo(END);
    expect(match.state.period).toBe("halfTime");
    playToFullTime(match);
    expect(match.state.period).toBe("fullTime");
    expect(match.state.score).toEqual(plain().state.score);
  });

  it("changes nothing once the match is over", () => {
    const match = create();
    playToFullTime(match);
    const events = match.events.length;
    playToFullTime(match);
    expect(match.events).toHaveLength(events);
  });
});
