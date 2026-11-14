import { describe, expect, it } from "vitest";
import { createMatch, type MatchChange, NEUTRAL_TACTICS } from "../engine";
import type { Career } from "./career";
import { aCareer, deepFreeze } from "./career-builders";
import { completeMatchday } from "./complete-matchday";
import type { Fixture } from "./generate-fixtures";
import { matchInputFor, matchSeed } from "./match-input-for";
import { planHalfTime } from "./plan-half-time";
import type { Player } from "./player";
import { ATTRIBUTE_NAMES } from "./player";
import type { PlayerPosition } from "./squad-player";

const userFixtureOf = (career: Career): Fixture =>
  career.season.fixtures.find(
    (f) => f.homeClubId === career.userClubId || f.awayClubId === career.userClubId,
  ) as Fixture;

const positionOf = (career: Career, id: string): PlayerPosition =>
  (career.league.players.find((p) => p.id === id) as Player).position;

/** The nth starter of a position and the nth bench player of the same position. */
const pair = (career: Career, position: PlayerPosition, n = 0) => {
  const { starters, bench } = career.squadPlan;
  return {
    off: starters.filter((id) => positionOf(career, id) === position)[n] as string,
    on: bench.filter((id) => positionOf(career, id) === position)[n] as string,
  };
};

const outfieldPairs = (career: Career, count: number) => {
  const positions: PlayerPosition[] = ["DEF", "MID", "FWD"];
  const result: { off: string; on: string }[] = [];
  for (const position of positions) {
    for (let n = 0; result.length < count; n++) {
      const p = pair(career, position, n);
      if (!p.off || !p.on) break;
      result.push(p);
    }
  }
  return result;
};

const sideOf = (career: Career, fixture: Fixture) =>
  fixture.homeClubId === career.userClubId ? "home" : "away";

const plan = (career: Career, changes: Parameters<typeof planHalfTime>[2]) =>
  planHalfTime(career, userFixtureOf(career), changes);

describe("planHalfTime", () => {
  it("gives the unchanged profile and tactics and 90 minutes to all starters without changes", () => {
    const career = deepFreeze(aCareer());
    const fixture = userFixtureOf(career);
    const input = matchInputFor(career, fixture);
    const side = sideOf(career, fixture);

    const result = planHalfTime(career, fixture, { substitutions: [] });

    if (!result.ok) throw new Error(result.error);
    expect(result.change).toEqual({
      side,
      profile: input[side],
      tactics: side === "home" ? input.homeTactics : input.awayTactics,
    });
    for (const id of career.squadPlan.starters) expect(result.report.minutes[id]).toBe(90);
    for (const id of career.squadPlan.bench) expect(result.report.minutes[id]).toBe(0);
    expect(result.lineupAfter).toEqual({
      formation: career.squadPlan.formation,
      starters: career.squadPlan.starters,
      bench: career.squadPlan.bench,
    });
  });

  it("returns the new tactics in the change", () => {
    const career = aCareer();
    const attacking = { ...NEUTRAL_TACTICS, mentality: "attacking" as const };

    const result = plan(career, { substitutions: [], tactics: attacking });

    if (!result.ok) throw new Error(result.error);
    expect(result.change.tactics).toEqual(attacking);
  });

  it("gives 45 minutes to the player going off and the one coming on, and swaps them in the lineup", () => {
    const career = aCareer();
    const { off, on } = pair(career, "MID");

    const result = plan(career, { substitutions: [{ off, on }] });

    if (!result.ok) throw new Error(result.error);
    expect(result.report.minutes[off]).toBe(45);
    expect(result.report.minutes[on]).toBe(45);
    expect(result.lineupAfter.starters).toContain(on);
    expect(result.lineupAfter.starters).not.toContain(off);
    expect(result.lineupAfter.bench).toContain(off);
    expect(result.lineupAfter.bench).toHaveLength(career.squadPlan.bench.length);
    const others = career.squadPlan.starters.filter((id) => id !== off);
    for (const id of others) expect(result.report.minutes[id]).toBe(90);
  });

  it("handles five substitutions", () => {
    const career = aCareer();
    const subs = outfieldPairs(career, 5);
    expect(subs).toHaveLength(5);

    const result = plan(career, { substitutions: subs });

    if (!result.ok) throw new Error(result.error);
    for (const { off, on } of subs) {
      expect(result.report.minutes[off]).toBe(45);
      expect(result.report.minutes[on]).toBe(45);
    }
    const used = new Set(subs.flatMap((s) => [s.off, s.on]));
    const full = career.squadPlan.starters.filter((id) => !used.has(id));
    for (const id of full) expect(result.report.minutes[id]).toBe(90);
    const unused = career.squadPlan.bench.filter((id) => !used.has(id));
    for (const id of unused) expect(result.report.minutes[id]).toBe(0);
  });

  it("rejects a sixth substitution", () => {
    const career = aCareer();
    const subs = outfieldPairs(career, 5);
    const sixth = pair(career, "GK");

    const result = plan(career, { substitutions: [...subs, sixth] });

    expect(result).toEqual({ ok: false, error: "too-many-substitutions" });
  });

  it("rejects a player going off who is not on the pitch", () => {
    const career = aCareer();
    const { on } = pair(career, "MID");
    const benchMid = career.squadPlan.bench.find(
      (id) => positionOf(career, id) === "MID" && id !== on,
    );
    const off = benchMid ?? on;

    const result = plan(career, { substitutions: [{ off, on }] });

    expect(result).toEqual({ ok: false, error: "player-not-on-pitch" });
  });

  it("rejects a player coming on who is not on the bench", () => {
    const career = aCareer();
    const { off } = pair(career, "MID", 0);
    const on = pair(career, "MID", 1).off;

    const result = plan(career, { substitutions: [{ off, on }] });

    expect(result).toEqual({ ok: false, error: "player-not-on-bench" });
  });

  it("rejects a substitute of another position", () => {
    const career = aCareer();
    const { off } = pair(career, "MID");
    const on = pair(career, "FWD").on;

    const result = plan(career, { substitutions: [{ off, on }] });

    expect(result).toEqual({ ok: false, error: "position-mismatch" });
  });

  it("rejects the same player going off or coming on twice", () => {
    const career = aCareer();
    const a = pair(career, "MID", 0);
    const b = pair(career, "MID", 1);

    expect(plan(career, { substitutions: [a, { off: a.off, on: b.on }] })).toEqual({
      ok: false,
      error: "duplicate-substitution",
    });
    expect(plan(career, { substitutions: [a, { off: b.off, on: a.on }] })).toEqual({
      ok: false,
      error: "duplicate-substitution",
    });
  });

  it("does not let a player who came on go off again", () => {
    const career = aCareer();
    const a = pair(career, "MID", 0);

    const result = plan(career, { substitutions: [a, { off: a.on, on: a.off }] });

    expect(result.ok).toBe(false);
  });

  it("does not change the career on failure or success", () => {
    const career = deepFreeze(aCareer());
    const { off, on } = pair(career, "MID");

    expect(plan(career, { substitutions: [{ off, on: off }] }).ok).toBe(false);
    expect(plan(career, { substitutions: [{ off, on }] }).ok).toBe(true);
  });

  it("raises the second-half rating when a fresh substitute replaces a tired player of equal quality", () => {
    const base = aCareer();
    const { off, on } = pair(base, "MID");
    const offPlayer = base.league.players.find((p) => p.id === off) as Player;
    const clones = Object.fromEntries(ATTRIBUTE_NAMES.map((a) => [a, offPlayer[a]]));
    const career: Career = {
      ...base,
      league: {
        ...base.league,
        players: base.league.players.map((p) => (p.id === on ? { ...p, ...clones } : p)),
      },
      condition: {
        ...base.condition,
        [off]: { fitness: 40, form: 5 },
        [on]: { fitness: 100, form: 5 },
      },
    };
    const kept = plan(career, { substitutions: [] });
    const swapped = plan(career, { substitutions: [{ off, on }] });

    if (!kept.ok || !swapped.ok) throw new Error("plan failed");
    const before = kept.change.profile as NonNullable<MatchChange["profile"]>;
    const after = swapped.change.profile as NonNullable<MatchChange["profile"]>;
    expect(after.progression + after.buildUp + after.chanceCreation).toBeGreaterThan(
      before.progression + before.buildUp + before.chanceCreation,
    );
  });

  it("feeds completeMatchday: a substituted-off player loses half the fitness of a full-match starter", () => {
    const career = aCareer();
    const fixture = userFixtureOf(career);
    const { off, on } = pair(career, "MID");
    const result = plan(career, { substitutions: [{ off, on }] });
    if (!result.ok) throw new Error(result.error);
    const draw = {
      fixtureId: fixture.id,
      homeClubId: fixture.homeClubId,
      awayClubId: fixture.awayClubId,
      homeGoals: 1,
      awayGoals: 1,
    };

    const done = completeMatchday(career, draw, result.report);

    if (!done.ok) throw new Error(done.error);
    // fitness = after drain, then recovery of 25% of the gap: lost = (1 - 0.25) * drain
    const lost = (id: string) => 100 - (done.career.condition[id]?.fitness ?? 0);
    const starter = career.squadPlan.starters.find((id) => id !== off) as string;
    expect(lost(off)).toBeCloseTo(lost(starter) / 2);
    expect(lost(on)).toBeCloseTo(lost(starter) / 2);
  });

  it("gives the same match twice for the same seed and plan", () => {
    const career = aCareer();
    const fixture = userFixtureOf(career);
    const { off, on } = pair(career, "FWD");
    const attacking = { ...NEUTRAL_TACTICS, mentality: "attacking" as const };
    const result = plan(career, { substitutions: [{ off, on }], tactics: attacking });
    if (!result.ok) throw new Error(result.error);

    const play = () => {
      const match = createMatch(matchInputFor(career, fixture), matchSeed(career, fixture));
      match.advanceTo(1_000_000);
      match.applyChange(result.change);
      match.resume();
      match.advanceTo(1_000_000);
      return { events: match.events, score: match.state.score, changes: match.changes };
    };

    expect(play()).toEqual(play());
    expect(play().changes).toHaveLength(1);
  });
});
