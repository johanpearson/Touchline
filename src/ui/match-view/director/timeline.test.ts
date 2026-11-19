import { describe, expect, it } from "vitest";
import type { ActionEvent } from "../../../engine";
import {
  ACTIVE_DISTANCE,
  HOLDS,
  MIN_DURATION,
  PLAYBACK_MODES,
  type PlaybackMode,
} from "./constants";
import {
  aCarry,
  aFoul,
  aPass,
  aPeriodChange,
  aSetPiece,
  aShot,
  quietRun,
  SEEDS,
  seededMatchEvents,
} from "./director-test-support";
import { buildTimeline, extendTimeline, type Segment } from "./timeline";

const closeToGoal = { x: 102, y: 34 };
const farFromGoals = { x: 52.5, y: 34 };

const playOf = (segments: readonly Segment[], eventIndex: number) =>
  segments.find((s) => s.eventIndex === eventIndex && s.kind === "play");
const length = (s: Segment | undefined) =>
  s ? s.presentationEnd - s.presentationStart : Number.NaN;

/** Events followed by a closing period change so the last real event is committed. */
const log = (...events: ActionEvent[]): ActionEvent[] => {
  const last = events.at(-1);
  return [...events, aPeriodChange((last?.time ?? 0) + 3, "halfTime")];
};

describe("buildTimeline", () => {
  it("gives every action near a goal at least its minimum duration in full mode", () => {
    const events = log(
      aPass({ time: 0, ...closeToGoal }),
      aCarry({ time: 3, ...closeToGoal }),
      aPass({ time: 6, ...closeToGoal }),
    );
    const { segments } = buildTimeline(events, "full");
    expect(length(playOf(segments, 0))).toBeGreaterThanOrEqual(MIN_DURATION.pass);
    expect(length(playOf(segments, 1))).toBeGreaterThanOrEqual(MIN_DURATION.carry);
    expect(MIN_DURATION.pass).toBe(0.8);
  });

  it("compresses the quiet actions between the key actions of a beat to a fraction of the engine time", () => {
    const { segments, duration } = buildTimeline(log(...quietRun(20)), "full");
    expect(duration).toBeLessThan((20 * 3) / 4);
    const between = segments.find((s) => s.kind === "play" && !s.moment);
    expect(length(between)).toBeLessThan(MIN_DURATION.pass);
  });

  it("slows play down as the ball gets close to a goal", () => {
    const at = (x: number) =>
      length(
        playOf(
          buildTimeline(log(aPass({ time: 0, x }), aPass({ time: 3, x })), "full").segments,
          0,
        ),
      );
    expect(at(105 - ACTIVE_DISTANCE.full + 0.5)).toBeLessThan(at(105 - 3));
    expect(at(105 - 1)).toBeCloseTo(at(105 - 3), 9);
  });

  it("holds the clock before and after a shot and longer after a goal", () => {
    const { segments } = buildTimeline(
      log(
        aShot({ time: 0, outcome: "saved", ...farFromGoals }),
        aShot({ time: 10, outcome: "goal", ...farFromGoals }),
      ),
      "full",
    );
    const holds = (i: number, which: "before" | "after") => {
      const play = segments.findIndex((s) => s.eventIndex === i && s.kind === "play");
      const hold = segments[which === "before" ? play - 1 : play + 1];
      expect(hold?.kind).toBe("hold");
      expect(hold?.matchStart).toBe(hold?.matchEnd);
      return hold ? hold.presentationEnd - hold.presentationStart : 0;
    };
    expect(holds(0, "before")).toBe(HOLDS.shot.before);
    expect(holds(0, "after")).toBe(HOLDS.shot.after);
    expect(holds(1, "after")).toBe(HOLDS.goal.after);
    expect(HOLDS.goal.after).toBeGreaterThan(HOLDS.shot.after);
  });

  it("holds the clock around set pieces, penalties and penalty fouls", () => {
    const { segments } = buildTimeline(
      log(
        aSetPiece({ time: 0, variant: "corner" }),
        aSetPiece({ time: 5, variant: "penalty" }),
        aFoul({ time: 10, outcome: "penalty" }),
      ),
      "full",
    );
    expect(segments.filter((s) => s.kind === "hold")).toHaveLength(6);
  });

  it("is contiguous and monotone in presentation and match time", () => {
    for (const mode of PLAYBACK_MODES) {
      const { segments } = buildTimeline(seededMatchEvents(1), mode);
      segments.forEach((s, i) => {
        expect(s.presentationEnd).toBeGreaterThanOrEqual(s.presentationStart);
        expect(s.matchEnd).toBeGreaterThanOrEqual(s.matchStart);
        const next = segments[i + 1];
        if (!next) return;
        expect(next.presentationStart).toBeCloseTo(s.presentationEnd, 9);
        expect(next.matchStart).toBe(s.matchEnd);
        expect(next.eventIndex).toBeGreaterThanOrEqual(s.eventIndex);
      });
    }
  });

  it("never skips a shot, goal, set piece, penalty or penalty foul in any mode", () => {
    for (const seed of SEEDS.slice(0, 4)) {
      const events = seededMatchEvents(seed);
      for (const mode of PLAYBACK_MODES) {
        const { segments } = buildTimeline(events, mode);
        events.forEach((e, i) => {
          const key =
            e.type === "shot" ||
            (e.type === "setPiece" && ["corner", "freeKick", "penalty"].includes(e.variant)) ||
            (e.type === "foul" && e.outcome === "penalty");
          if (key) expect(length(playOf(segments, i)), `${mode} #${i}`).toBeGreaterThan(0);
        });
      }
    }
  });

  it("cuts between key moments in highlights mode and keeps a lead-in", () => {
    const events = log(
      ...quietRun(40),
      aShot({ time: 120, ...farFromGoals, outcome: "goal" }),
      ...quietRun(40, 125),
    );
    const { segments } = buildTimeline(events, "highlights");
    const cuts = segments.filter((s) => s.kind === "cut");
    expect(cuts.length).toBeGreaterThan(30);
    expect(
      cuts.every((s) => s.presentationStart === s.presentationEnd && s.matchEnd > s.matchStart),
    ).toBe(true);
    const leadIn = segments.filter(
      (s) => s.kind === "play" && s.eventIndex >= 38 && s.eventIndex < 40,
    );
    expect(leadIn.length).toBeGreaterThan(0);
  });

  it("stops at half-time and full time", () => {
    const first = buildTimeline(log(...quietRun(10)), "full");
    expect(first.matchTimeAt(first.duration + 100)).toBe(first.matchEnd);
    expect(first.matchEnd).toBe(30);
  });

  it("maps the match times the same way for matches of any seed", () => {
    for (const seed of SEEDS.slice(0, 3)) {
      const t = buildTimeline(seededMatchEvents(seed), "full");
      expect(t.matchTimeAt(0)).toBe(0);
      expect(t.matchTimeAt(t.duration)).toBe(t.matchEnd);
    }
  });
});

describe("inverse mapping", () => {
  it("matchTimeAt and presentationTimeAt are inverse on every segment boundary", () => {
    for (const mode of ["full", "extended"] as const) {
      const t = buildTimeline(seededMatchEvents(2), mode);
      for (const s of t.segments) {
        expect(t.matchTimeAt(t.presentationTimeAt(s.matchEnd))).toBeCloseTo(s.matchEnd, 6);
        expect(t.matchTimeAt(t.presentationTimeAt(s.matchStart))).toBeCloseTo(s.matchStart, 6);
        const mid = (s.matchStart + s.matchEnd) / 2;
        expect(t.matchTimeAt(t.presentationTimeAt(mid))).toBeCloseTo(mid, 6);
      }
    }
  });

  it("presentationTimeAt returns the first moment a match time is reached", () => {
    const t = buildTimeline(
      log(...quietRun(1), aShot({ time: 3, ...farFromGoals }), ...quietRun(2, 6)),
      "full",
    );
    const p = t.presentationTimeAt(3);
    expect(t.matchTimeAt(p)).toBe(3);
    expect(t.matchTimeAt(p - 0.01)).toBeLessThan(3);
    expect(t.presentationTimeAt(-5)).toBe(0);
    expect(t.presentationTimeAt(1e6)).toBe(t.duration);
  });

  it("maps a match time inside a cut to the instant of the cut", () => {
    const t = buildTimeline(
      log(...quietRun(40), aShot({ time: 120, ...farFromGoals })),
      "highlights",
    );
    const cut = t.segments.find((s) => s.kind === "cut");
    expect(cut).toBeDefined();
    if (!cut) return;
    expect(t.presentationTimeAt((cut.matchStart + cut.matchEnd) / 2)).toBe(cut.presentationStart);
  });
});

describe("extendTimeline", () => {
  const split = (events: readonly ActionEvent[], at: number): [ActionEvent[], ActionEvent[]] => [
    events.slice(0, at),
    events.slice(at),
  ];

  it("equals building the whole log at once and leaves earlier segments untouched", () => {
    for (const mode of PLAYBACK_MODES) {
      const events = seededMatchEvents(3);
      const whole = buildTimeline(events, mode);
      let timeline = buildTimeline([], mode);
      let before: readonly Segment[] = [];
      for (let i = 0; i < events.length; i += 37) {
        timeline = extendTimeline(timeline, events.slice(i, i + 37));
        const kept = timeline.segments.slice(0, before.length);
        expect(kept).toEqual(before);
        before = timeline.segments;
      }
      expect(timeline.segments).toEqual(whole.segments);
      expect(timeline.duration).toBeCloseTo(whole.duration, 9);
    }
  });

  it("waits for the end of a beat before committing it", () => {
    const [first, rest] = split(log(...quietRun(6)), 3);
    const partial = buildTimeline(first, "full");
    expect(partial.segments.some((s) => s.eventIndex === 2)).toBe(false);
    const extended = extendTimeline(partial, rest);
    expect(extended.segments.some((s) => s.eventIndex === 2)).toBe(true);
  });

  it("does not change the timeline it extends", () => {
    const base = buildTimeline(quietRun(5), "full");
    const count = base.segments.length;
    extendTimeline(base, quietRun(5, 15));
    expect(base.segments).toHaveLength(count);
  });
});

describe("duration targets over seeded matches", () => {
  const TARGETS: Record<PlaybackMode, [number, number]> = {
    full: [6 * 60, 10 * 60],
    extended: [3 * 60, 5 * 60],
    highlights: [90, 3 * 60],
  };

  for (const mode of PLAYBACK_MODES) {
    it(`takes ${TARGETS[mode][0]} to ${TARGETS[mode][1]} seconds for a match in ${mode} mode`, () => {
      expect(SEEDS.length).toBeGreaterThanOrEqual(10);
      for (const seed of SEEDS) {
        const { duration } = buildTimeline(seededMatchEvents(seed), mode);
        expect(duration, `seed ${seed}`).toBeGreaterThanOrEqual(TARGETS[mode][0]);
        expect(duration, `seed ${seed}`).toBeLessThanOrEqual(TARGETS[mode][1]);
      }
    });
  }
});

describe("performance", () => {
  it("builds and extends a full match well inside a tick", () => {
    const events = seededMatchEvents(1);
    const start = performance.now();
    buildTimeline(events, "full");
    let t = buildTimeline([], "highlights");
    for (let i = 0; i < events.length; i += 10) t = extendTimeline(t, events.slice(i, i + 10));
    expect(performance.now() - start).toBeLessThan(500);
  });
});
