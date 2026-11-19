import { describe, expect, it } from "vitest";
import type { ActionMatch, ActionMatchChange, TimedActionMatchChange } from "../engine";
import { aCareer } from "./career-builders";
import { createCoachedMatch } from "./coached-match";
import type { Fixture } from "./generate-fixtures";
import { identityOf, type MatchSession } from "./match-session";
import { resumeMatch } from "./resume-match";

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
