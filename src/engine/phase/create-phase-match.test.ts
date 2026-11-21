import { describe, expect, it } from "vitest";
import { aMatchInput, aTeamSheet } from "../action/action-builders";
import type { ActionMatchChange } from "../action/action-match";
import type { MatchInput } from "../action/match-input";
import { createPhaseMatch } from "./create-phase-match";

const input = (): MatchInput => ({ ...aMatchInput().build(), engineVersion: 3 });

const played = (seed: number, detail: "full" | "fast" = "fast", options = {}) => {
  const match = createPhaseMatch(input(), seed, { detail, ...options });
  match.advanceTo(10_000);
  match.resume();
  match.advanceTo(20_000);
  return match;
};

const goalsIn = (match: ReturnType<typeof played>) => {
  const score = { home: 0, away: 0 };
  for (const step of match.steps) {
    if (step.outcome === "chance" && step.chance.result === "goal") score[step.team]++;
  }
  return score;
};

describe("createPhaseMatch", () => {
  it("opens with a kickoff event at time 0", () => {
    const match = createPhaseMatch(input(), 3);

    expect(match.events[0]).toMatchObject({ type: "setPiece", variant: "kickoff", time: 0 });
    expect(match.state).toMatchObject({ time: 0, period: "firstHalf" });
  });

  it("stops at half-time with a period change and the first half's steps only", () => {
    const match = createPhaseMatch(input(), 3);
    match.advanceTo(10_000);

    expect(match.state.period).toBe("halfTime");
    expect(match.state.time).toBeGreaterThanOrEqual(2700);
    expect(match.state.time).toBeLessThanOrEqual(2700 + 4 * 60 + 10);
    expect(match.events.at(-1)).toMatchObject({ type: "periodChange", period: "halfTime" });
    expect(match.steps.every((s) => s.period === "firstHalf")).toBe(true);
    expect(match.steps.at(-1)?.outcome).toBe("periodEnd");
  });

  it("plays the second half after resume and ends at full time", () => {
    const match = played(3);

    expect(match.state.period).toBe("fullTime");
    expect(match.state.time).toBeGreaterThanOrEqual(5400);
    expect(match.events.at(-1)).toMatchObject({ type: "periodChange", period: "fullTime" });
    const second = match.steps.filter((s) => s.period === "secondHalf");
    expect(second[0]).toMatchObject({ start: "kickoff" });
  });

  it("gives the other side the second-half kickoff", () => {
    const match = played(3);

    const first = match.steps[0];
    const second = match.steps.find((s) => s.period === "secondHalf");
    expect(second?.team).not.toBe(first?.team);
  });

  it("throws when resumed outside half-time", () => {
    const match = createPhaseMatch(input(), 3);

    expect(() => match.resume()).toThrow(Error);
  });

  it("reports the score from the goals in the steps and follows a goal with a kickoff", () => {
    const match = played(11);
    const goals = goalsIn(match);

    expect(match.state.score).toEqual(goals);
    for (const [i, step] of match.steps.entries()) {
      if (step.outcome === "chance" && step.chance.result === "goal") {
        const next = match.steps[i + 1];
        if (next !== undefined && next.period === step.period) {
          expect(next).toMatchObject({ start: "kickoff" });
          expect(next.team).not.toBe(step.team);
        }
      }
    }
  });

  it("counts fouls against the side that committed them", () => {
    const match = played(5);

    const committed = { home: 0, away: 0 };
    for (const step of match.steps) {
      if (step.outcome === "foul") committed[step.team === "home" ? "away" : "home"]++;
    }
    expect(match.state.fouls).toEqual(committed);
  });

  it("gives the same steps and events however advanceTo is split", () => {
    const whole = createPhaseMatch(input(), 21, { detail: "fast" });
    whole.advanceTo(10_000);
    const split = createPhaseMatch(input(), 21, { detail: "fast" });
    for (let t = 7; t < 3200; t += 7) split.advanceTo(t);
    split.advanceTo(10_000);

    expect(split.steps).toEqual(whole.steps);
    expect(split.events).toEqual(whole.events);
    expect(split.state).toEqual(whole.state);
  });

  it("gives the same steps, score and xG in fast and full detail", () => {
    const fast = played(8, "fast");
    const full = played(8, "full");

    expect(full.steps).toEqual(fast.steps);
    expect(full.state.score).toEqual(fast.state.score);
    expect(full.events.length).toBe(fast.events.length);
    expect(full.events.every((e) => e.snapshot !== undefined)).toBe(true);
    expect(fast.events.every((e) => e.snapshot === undefined)).toBe(true);
  });

  it("repeats the same match for the same seed and differs for another", () => {
    expect(played(4).steps).toEqual(played(4).steps);
    expect(played(4).steps).not.toEqual(played(5).steps);
  });

  it("never lets a step start before the previous one ended and keeps times in order", () => {
    const { steps } = played(9);

    for (const [i, step] of steps.entries()) {
      const before = steps[i - 1];
      if (before !== undefined && before.period === step.period) {
        expect(step.startTime).toBeCloseTo(before.endTime, 5);
      }
    }
  });

  it("drains energy once per match minute and keeps half-time free", () => {
    const match = createPhaseMatch(input(), 3, { detail: "fast" });
    match.advanceTo(10_000);
    const atHalf = match.state.energy["h-5"] as number;
    match.resume();
    match.advanceTo(20_000);

    expect(atHalf).toBeLessThan(100);
    expect(match.state.energy["h-5"] as number).toBeLessThan(atHalf);
  });

  it("keeps full attributes when the energy penalty is off but still reports energy", () => {
    const tired = played(6, "fast");
    const rested = played(6, "fast", { energyPenalty: false });

    expect(rested.state.energy["h-5"]).toBe(tired.state.energy["h-5"]);
    expect(rested.steps).not.toEqual(tired.steps);
  });

  it("applies a substitution from the next step and records the change", () => {
    const match = createPhaseMatch(input(), 3, { detail: "fast" });
    match.advanceTo(1000);
    const sheet = aTeamSheet("Home", "h").build();
    const bench = sheet.bench[0];
    const lineup = sheet.starters.map((p, i) =>
      i === 5 && bench ? { ...bench, position: p.position } : p,
    );
    const change: ActionMatchChange = { side: "home", lineup };

    const result = match.applyChange(change);

    expect(result.ok).toBe(true);
    expect(match.changes).toEqual([{ time: 1000, change }]);
    match.advanceTo(10_000);
    const after = match.steps
      .filter((s) => s.startTime > 1000)
      .flatMap((s) => s.chain.map((c) => c.player));
    expect(after).not.toContain("h-6");
  });

  it("rejects an invalid change and leaves the match untouched", () => {
    const match = createPhaseMatch(input(), 3, { detail: "fast" });

    const result = match.applyChange({ side: "home", lineup: [] });

    expect(result.ok).toBe(false);
    expect(match.changes).toEqual([]);
  });

  it("throws a RangeError for an invalid side or time", () => {
    const match = createPhaseMatch(input(), 3);

    expect(() => match.applyChange({ side: "left" as "home" })).toThrow(RangeError);
    expect(() => match.advanceTo(Number.NaN)).toThrow(RangeError);
  });

  it("ignores changes and further time after full time", () => {
    const match = played(3);
    const eventCount = match.events.length;

    const result = match.applyChange({
      side: "home",
      tactics: match.steps.length ? aTeamSheet("x", "h").build().tactics : undefined,
    });
    match.advanceTo(30_000);

    expect(result).toEqual({ ok: true });
    expect(match.changes).toEqual([]);
    expect(match.events.length).toBe(eventCount);
  });
});
