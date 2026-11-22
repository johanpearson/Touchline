import { describe, expect, it } from "vitest";
import type { ChanceResult } from "../../../engine";
import { chanceMomentAt } from "./chance-moment-at";
import { CHANCE_MOMENT, HOLDS, MODE_TARGET_MINUTES, PLAYBACK_MODES } from "./constants";
import {
  aChance,
  aPass,
  aPeriodChange,
  aShot,
  SEEDS,
  seededV3Match,
} from "./director-test-support";
import { buildTimeline, extendTimeline, type Segment } from "./timeline";

const farFromGoals = { x: 52.5, y: 34 };
const RESULTS: ChanceResult[] = ["goal", "saved", "woodwork", "blocked", "wide", "over"];

/** Three passes, the creator's pass last, the shot at 9 s and a closing period change. */
const chanceLog = (
  outcome: "goal" | "saved" = "saved",
  xg = 0.4,
  team: "home" | "away" = "home",
) => [
  aPass({ time: 0, team, ...farFromGoals }),
  aPass({ time: 3, team, ...farFromGoals }),
  aPass({ time: 6, team, ...farFromGoals }),
  aShot({ time: 9, team, outcome, xg, ...farFromGoals }),
  aPeriodChange(12, "halfTime"),
];

const seconds = (s: Segment | undefined) => (s ? s.presentationEnd - s.presentationStart : 0);
const staged = (segments: readonly Segment[], stage: string) =>
  segments.filter((s) => s.chance?.stage === stage);

describe("chance moments", () => {
  it("plays a clear chance in stages: the creator's pass, a hold, the shot, then the reaction hold", () => {
    const { segments } = buildTimeline(chanceLog(), "full", [
      aChance({ time: 9, result: "saved" }),
    ]);
    expect(staged(segments, "creator").map((s) => s.eventIndex)).toEqual([2]);
    expect(staged(segments, "shot").map((s) => s.eventIndex)).toEqual([3]);
    expect(staged(segments, "reaction")).toHaveLength(1);
    expect(seconds(staged(segments, "creator")[0])).toBeGreaterThanOrEqual(
      CHANCE_MOMENT.creatorSeconds.full,
    );
  });

  it("holds longer after a near miss than after an ordinary shot, and longest after a goal", () => {
    const reaction = (result: ChanceResult) =>
      seconds(
        staged(
          buildTimeline(chanceLog(result === "goal" ? "goal" : "saved"), "full", [
            aChance({ time: 9, result }),
          ]).segments,
          "reaction",
        )[0],
      );
    for (const result of RESULTS) {
      expect(reaction(result), result).toBeGreaterThan(0);
      if (result !== "goal") expect(reaction(result), result).toBeGreaterThan(HOLDS.shot.after);
    }
    expect(reaction("goal")).toBeGreaterThan(reaction("woodwork"));
    expect(reaction("woodwork")).toBeGreaterThan(reaction("blocked"));
  });

  it("tags the shot and the reaction with the result", () => {
    const { segments } = buildTimeline(chanceLog(), "full", [
      aChance({ time: 9, result: "woodwork" }),
    ]);
    expect(staged(segments, "shot")[0]?.chance?.result).toBe("woodwork");
    expect(staged(segments, "reaction")[0]?.chance?.result).toBe("woodwork");
  });

  it("leaves steps below 0.25 xG as they were", () => {
    const events = chanceLog("saved", 0.1);
    const plain = buildTimeline(events, "full");
    const withChance = buildTimeline(events, "full", [
      aChance({ time: 9, result: "saved", xg: 0.1 }),
    ]);
    expect(withChance.segments).toEqual(plain.segments);
  });

  it("ignores a chance whose shot is not in the log", () => {
    const events = chanceLog();
    const plain = buildTimeline(events, "full");
    expect(buildTimeline(events, "full", [aChance({ time: 99, result: "goal" })]).segments).toEqual(
      plain.segments,
    );
  });

  it("works in every mode", () => {
    for (const mode of PLAYBACK_MODES) {
      const { segments } = buildTimeline(chanceLog(), mode, [aChance({ time: 9, result: "wide" })]);
      expect(staged(segments, "shot"), mode).toHaveLength(1);
    }
  });
});

describe("chance moments over seeded engine v3 matches", () => {
  it("gives every clear chance a shot moment with its build-up in highlights mode", () => {
    for (const seed of SEEDS.slice(0, 4)) {
      const { events, chances } = seededV3Match(seed);
      const clear = chances.filter((c) => c.clear);
      expect(clear.length, `seed ${seed}`).toBeGreaterThan(0);
      const { segments } = buildTimeline(events, "highlights", chances);
      expect(staged(segments, "shot"), `seed ${seed}`).toHaveLength(clear.length);
      for (const shot of staged(segments, "shot")) {
        const phase = segments.filter((s) => s.phase === shot.phase && s.kind === "play");
        expect(phase.length, `seed ${seed}`).toBeGreaterThan(1);
      }
    }
  });

  for (const mode of PLAYBACK_MODES) {
    const { min, max } = MODE_TARGET_MINUTES[mode];
    it(`keeps a match in ${mode} mode between ${min} and ${max} minutes with the chance moments`, () => {
      for (const seed of SEEDS) {
        const { events, chances } = seededV3Match(seed);
        const { duration } = buildTimeline(events, mode, chances);
        expect(duration / 60, `seed ${seed}`).toBeGreaterThanOrEqual(min);
        expect(duration / 60, `seed ${seed}`).toBeLessThanOrEqual(max);
      }
    });
  }

  it("builds the same segments when the log and the chances arrive in pieces", () => {
    const { events, chances } = seededV3Match(3);
    for (const mode of PLAYBACK_MODES) {
      const whole = buildTimeline(events, mode, chances);
      let timeline = buildTimeline([], mode);
      let known = 0;
      for (let i = 0; i < events.length; i += 37) {
        const piece = events.slice(i, i + 37);
        const last = piece.at(-1)?.time ?? 0;
        const fresh = chances.filter((c) => c.time <= last).slice(known);
        known += fresh.length;
        timeline = extendTimeline(timeline, piece, fresh);
      }
      expect(timeline.segments).toEqual(whole.segments);
    }
  });
});

describe("chanceMomentAt", () => {
  const timeline = () =>
    buildTimeline(chanceLog("saved", 0.4, "away"), "full", [
      aChance({ time: 9, result: "woodwork", team: "away" }),
    ]);

  it("names the stage, side, shooter and keeper of the chance on screen at the clock", () => {
    const t = timeline();
    const shot = t.segments.find((s) => s.chance?.stage === "shot");
    const at = ((shot?.presentationStart ?? 0) + (shot?.presentationEnd ?? 0)) / 2;
    expect(chanceMomentAt(t, at)).toEqual({
      stage: "shot",
      result: "woodwork",
      team: "away",
      shooter: "b",
      keeper: "k",
    });
  });

  it("is undefined outside a chance and after the timeline ends", () => {
    const t = timeline();
    expect(chanceMomentAt(t, 0)).toBeUndefined();
    expect(chanceMomentAt(t, t.duration + 5)).toBeUndefined();
    expect(chanceMomentAt(buildTimeline(chanceLog(), "full"), 3)).toBeUndefined();
  });
});
