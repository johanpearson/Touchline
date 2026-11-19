import { describe, expect, it } from "vitest";
import { aCareer } from "./career-builders";
import { setTactics } from "./edit-squad-plan";
import type { Fixture } from "./generate-fixtures";
import {
  careerOfSession,
  fingerprintOf,
  identityOf,
  isSessionOfCareer,
  MATCH_SESSION_VERSION,
  type MatchSession,
  parseMatchSession,
  sessionIssue,
} from "./match-session";
import type { PlayerCondition } from "./player-condition";

const career = aCareer(3);
const fixtureOf = (c: typeof career): Fixture =>
  c.season.fixtures.find(
    (f) => f.homeClubId === c.userClubId || f.awayClubId === c.userClubId,
  ) as Fixture;
const fixture = fixtureOf(career);

const aSession = (overrides: Partial<MatchSession> = {}): MatchSession => ({
  ...identityOf(career, fixture),
  mode: "extended",
  changes: [],
  position: { matchTime: 120, period: "firstHalf" },
  ...overrides,
});

describe("parseMatchSession", () => {
  it("reads what JSON made of a session", () => {
    const session = aSession();
    expect(parseMatchSession(JSON.parse(JSON.stringify(session)))).toEqual({ ok: true, session });
  });

  it("refuses another schema version", () => {
    const other = { ...aSession(), schemaVersion: MATCH_SESSION_VERSION + 1 };
    expect(parseMatchSession(other)).toEqual({ ok: false, error: "unknown-version" });
  });

  it.each([
    ["not an object", 7],
    ["null", null],
    ["no version", {}],
    ["a missing field", { ...aSession(), fixtureId: undefined }],
    ["an unknown mode", { ...aSession(), mode: "turbo" }],
    ["an unknown period", { ...aSession(), position: { matchTime: 1, period: "extraTime" } }],
    ["a negative match time", { ...aSession(), position: { matchTime: -1, period: "firstHalf" } }],
    ["a malformed change", { ...aSession(), changes: [{ time: 1, change: { side: "left" } }] }],
  ])("refuses a damaged session: %s", (_name, value) => {
    expect(parseMatchSession(value)).toEqual({ ok: false, error: "corrupt" });
  });
});

describe("sessionIssue", () => {
  it("accepts the session of the same match", () => {
    expect(sessionIssue(aSession(), career, fixture)).toBeNull();
  });

  it("accepts the session when the loaded career holds an older plan than the one kicked off with", () => {
    const edited = setTactics(career, { ...career.squadPlan.tactics, tempo: "fast" });
    const session = { ...aSession(), ...identityOf(edited, fixture) };
    expect(sessionIssue(session, career, fixture)).toBeNull();
  });

  it("names another career", () => {
    const other = aCareer(4);
    expect(sessionIssue(aSession(), other, fixtureOf(other))).toBe("other-career");
  });

  it("names another fixture and another season", () => {
    const next = career.season.fixtures.find((f) => f.id !== fixture.id) as Fixture;
    expect(sessionIssue(aSession(), career, next)).toBe("other-fixture");
    expect(sessionIssue(aSession({ season: 2 }), career, fixture)).toBe("other-fixture");
  });

  it("names another engine version", () => {
    expect(sessionIssue(aSession({ engineVersion: 1 }), career, fixture)).toBe("engine-version");
  });

  it("names a changed squad", () => {
    const starter = career.squadPlan.starters[0] as string;
    const tired = {
      ...career,
      condition: {
        ...career.condition,
        [starter]: { ...(career.condition[starter] as PlayerCondition), fitness: 10 },
      },
    };
    expect(sessionIssue(aSession(), tired, fixture)).toBe("squad-changed");
  });
});

describe("careerOfSession and isSessionOfCareer", () => {
  it("uses the plan the match was kicked off with", () => {
    const edited = setTactics(career, { ...career.squadPlan.tactics, tempo: "fast" });
    const session = { ...aSession(), ...identityOf(edited, fixture) };
    expect(careerOfSession(career, session).squadPlan).toEqual(edited.squadPlan);
  });

  it("tells whether the session is of this career and season", () => {
    expect(isSessionOfCareer(aSession(), career)).toBe(true);
    expect(isSessionOfCareer(aSession({ season: 9 }), career)).toBe(false);
    expect(isSessionOfCareer(aSession({ userClubId: "x" }), career)).toBe(false);
  });
});

describe("fingerprintOf", () => {
  it("is stable and tells different values apart", () => {
    expect(fingerprintOf({ a: 1 })).toBe(fingerprintOf({ a: 1 }));
    expect(fingerprintOf({ a: 1 })).not.toBe(fingerprintOf({ a: 2 }));
    expect(fingerprintOf({ a: 1 })).toMatch(/^[0-9a-f]{8}$/);
  });
});
