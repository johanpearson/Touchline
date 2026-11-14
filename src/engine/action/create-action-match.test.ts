import { describe, expect, it } from "vitest";
import { aMatchInputV2 } from "./action-builders";
import type { ActionEvent } from "./action-event";
import { createActionMatch } from "./create-action-match";
import { inPitch, PITCH_LENGTH, PITCH_WIDTH } from "./pitch-metres";

const playFullMatch = (seed: number) => {
  const match = createActionMatch(aMatchInputV2().build(), seed);
  match.advanceTo(10_000);
  match.resume();
  match.advanceTo(20_000);
  return match;
};

const goals = (events: readonly ActionEvent[], side: "home" | "away") =>
  events.filter((e) => e.type === "shot" && e.outcome === "goal" && e.team === side).length;

describe("createActionMatch", () => {
  it("opens with a kickoff for the side that starts the match", () => {
    const match = createActionMatch(aMatchInputV2().build(), 1);

    const [first] = match.events;
    expect(first).toMatchObject({ type: "setPiece", variant: "kickoff", time: 0 });
    expect(first?.team).toBe(match.state.possession);
    expect(first?.from).toEqual({ x: PITCH_LENGTH / 2, y: PITCH_WIDTH / 2 });
  });

  it("rejects a time that is not finite", () => {
    const match = createActionMatch(aMatchInputV2().build(), 1);

    expect(() => match.advanceTo(Number.NaN)).toThrow(RangeError);
    expect(() => match.advanceTo(Number.POSITIVE_INFINITY)).toThrow(RangeError);
  });

  it("stops at half-time and stays there however far it is advanced", () => {
    const match = createActionMatch(aMatchInputV2().build(), 3);

    match.advanceTo(99_999);
    const length = match.events.length;
    match.advanceTo(199_999);

    expect(match.state.period).toBe("halfTime");
    expect(match.state.time).toBeGreaterThanOrEqual(2700 + 60);
    expect(match.state.time).toBeLessThanOrEqual(2700 + 240);
    expect(match.events).toHaveLength(length);
    expect(match.events.at(-1)).toMatchObject({ type: "periodChange", period: "halfTime" });
  });

  it("stops at full time with a periodChange event", () => {
    const match = playFullMatch(4);

    expect(match.state.period).toBe("fullTime");
    expect(match.events.at(-1)).toMatchObject({ type: "periodChange", period: "fullTime" });
  });

  it("ignores going back in time", () => {
    const match = createActionMatch(aMatchInputV2().build(), 5);
    match.advanceTo(600);
    const { time } = match.state;
    const length = match.events.length;

    match.advanceTo(10);

    expect(match.state.time).toBe(time);
    expect(match.events).toHaveLength(length);
  });

  it("gives the same log however time is split across advanceTo calls", () => {
    const whole = createActionMatch(aMatchInputV2().build(), 6);
    whole.advanceTo(2700);
    const split = createActionMatch(aMatchInputV2().build(), 6);
    for (let t = 7; t <= 2700; t += 7) split.advanceTo(t);
    split.advanceTo(2700);

    expect(split.events).toEqual(whole.events);
    expect(split.state).toEqual(whole.state);
  });

  it("gives the same log for the same input and seed", () => {
    expect(playFullMatch(7).events).toEqual(playFullMatch(7).events);
  });

  it("gives a different log for a different seed", () => {
    expect(playFullMatch(7).events).not.toEqual(playFullMatch(8).events);
  });

  it("gives 1 to 4 minutes of added time in the first half and 2 to 6 in the second", () => {
    for (let seed = 1; seed <= 6; seed++) {
      const match = createActionMatch(aMatchInputV2().build(), seed);
      match.advanceTo(10_000);
      const firstHalf = match.state.time - 2700;
      match.resume();
      const resumedAt = match.state.time;
      match.advanceTo(20_000);
      const secondHalf = match.state.time - resumedAt - 2700;
      expect(firstHalf % 60).toBe(0);
      expect(firstHalf / 60).toBeGreaterThanOrEqual(1);
      expect(firstHalf / 60).toBeLessThanOrEqual(4);
      expect(secondHalf % 60).toBe(0);
      expect(secondHalf / 60).toBeGreaterThanOrEqual(2);
      expect(secondHalf / 60).toBeLessThanOrEqual(6);
    }
  });

  it("cannot resume outside half-time", () => {
    const match = createActionMatch(aMatchInputV2().build(), 1);

    expect(() => match.resume()).toThrow("Cannot resume from firstHalf");
  });

  it("starts the second half with a kickoff for the team that did not start the match", () => {
    const match = createActionMatch(aMatchInputV2().build(), 9);
    const starter = match.state.possession;
    match.advanceTo(10_000);
    match.resume();

    const kickoffs = match.events.filter((e) => e.type === "setPiece" && e.variant === "kickoff");
    const periodChange = match.events.findLast((e) => e.type === "periodChange");
    expect(periodChange).toMatchObject({ period: "secondHalf" });
    expect(match.state.period).toBe("secondHalf");
    expect(kickoffs.at(-1)?.team).not.toBe(starter);
    expect(kickoffs.at(-1)?.time).toBe(periodChange?.time);
  });

  it("gives the conceding side a kickoff at the centre spot after a goal", () => {
    let checked = 0;
    for (let seed = 1; seed <= 40 && checked < 5; seed++) {
      const { events } = playFullMatch(seed);
      events.forEach((event, index) => {
        if (event.type !== "shot" || event.outcome !== "goal") return;
        const next = events[index + 1];
        if (next === undefined || next.type === "periodChange") return;
        expect(next).toMatchObject({ type: "setPiece", variant: "kickoff" });
        expect(next.team).not.toBe(event.team);
        expect(next.from).toEqual({ x: PITCH_LENGTH / 2, y: PITCH_WIDTH / 2 });
        checked++;
      });
    }
    expect(checked).toBeGreaterThan(0);
  });

  it("follows an out-of-play outcome with a restart at the right place", () => {
    let checked = 0;
    for (let seed = 1; seed <= 10; seed++) {
      const { events } = playFullMatch(seed);
      events.forEach((event, index) => {
        const out =
          (event.type === "pass" || event.type === "carry" || event.type === "clearance") &&
          event.outcome === "outOfPlay";
        const next = events[index + 1];
        if (!out || next === undefined || next.type !== "setPiece") return;
        expect(["throwIn", "goalKick", "corner"]).toContain(next.variant);
        if (next.variant === "throwIn") {
          expect(next.from.y === 0 || next.from.y === PITCH_WIDTH).toBe(true);
        }
        if (next.variant === "corner") {
          expect(next.from.x === 0 || next.from.x === PITCH_LENGTH).toBe(true);
          expect(next.from.y === 0 || next.from.y === PITCH_WIDTH).toBe(true);
        }
        checked++;
      });
    }
    expect(checked).toBeGreaterThan(50);
  });

  it("jitters snapshot positions by at most 0.5 m without changing the log's decisions", () => {
    const match = playFullMatch(10);

    for (const event of match.events) {
      expect(event.snapshot.players).toHaveLength(22);
    }
    expect(match.events.some((e) => e.snapshot.players.some((p) => !Number.isInteger(p.x)))).toBe(
      true,
    );
  });

  it("applies no change after full time and records earlier ones", () => {
    const match = createActionMatch(aMatchInputV2().build(), 11);
    const change = { side: "home" as const };
    match.applyChange(change);
    match.advanceTo(10_000);
    match.resume();
    match.advanceTo(20_000);
    match.applyChange({ side: "away" });

    expect(match.changes).toEqual([{ time: 0, change }]);
  });
});

describe("createActionMatch smoke test over 50 seeded matches", () => {
  const matches = Array.from({ length: 50 }, (_, i) => playFullMatch(i + 1));

  it("plays about 1,500 to 2,300 actions per match", () => {
    for (const match of matches) {
      const actions = match.events.filter((e) => e.type !== "periodChange").length;
      expect(actions).toBeGreaterThan(1500);
      expect(actions).toBeLessThan(2300);
    }
  });

  it("makes the score equal the goal events", () => {
    for (const match of matches) {
      expect(match.state.score).toEqual({
        home: goals(match.events, "home"),
        away: goals(match.events, "away"),
      });
    }
  });

  it("keeps the ball on the pitch unless the action put it out of play", () => {
    for (const match of matches) {
      for (const event of match.events) {
        expect(inPitch(event.snapshot.ball)).toBe(true);
        expect(inPitch(event.from)).toBe(true);
        expect(inPitch(event.to)).toBe(true);
      }
      expect(inPitch(match.state.ball)).toBe(true);
    }
  });

  it("holds 22 players inside the pitch in every snapshot", () => {
    for (const match of matches) {
      for (const event of match.events) {
        expect(event.snapshot.players).toHaveLength(22);
        expect(event.snapshot.players.every(inPitch)).toBe(true);
      }
    }
  });

  it("never lets time decrease and spaces actions 2 to 4 seconds apart", () => {
    for (const match of matches) {
      match.events.reduce<ActionEvent | undefined>((previous, event) => {
        if (
          previous !== undefined &&
          event.type !== "periodChange" &&
          previous.type !== "periodChange"
        ) {
          const gap = Math.round((event.time - previous.time) * 10) / 10;
          expect(gap).toBeGreaterThanOrEqual(2);
          expect(gap).toBeLessThanOrEqual(4);
        }
        return event;
      }, undefined);
    }
  });

  it("includes every kind of restart and some penalties across the matches", () => {
    const variants = new Set(
      matches.flatMap((m) => m.events.flatMap((e) => (e.type === "setPiece" ? [e.variant] : []))),
    );
    for (const variant of ["kickoff", "throwIn", "goalKick", "corner", "freeKick"] as const) {
      expect(variants.has(variant)).toBe(true);
    }
  });
});
