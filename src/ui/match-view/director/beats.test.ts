import { describe, expect, it } from "vitest";
import type { ActionEvent } from "../../../engine";
import { BEAT_SETTINGS, MIN_DURATION, PLAYBACK_MODES } from "./constants";
import {
  aFoul,
  aPass,
  aPeriodChange,
  aSetPiece,
  aShot,
  quietRun,
  SEEDS,
  seededMatchEvents,
} from "./director-test-support";
import { buildTimeline, type Segment } from "./timeline";

const nearGoal = { x: 100, y: 34 };

const log = (...events: ActionEvent[]): ActionEvent[] => {
  const last = events.at(-1);
  return [...events, aPeriodChange((last?.time ?? 0) + 3, "halfTime")];
};

const plays = (segments: readonly Segment[]) => segments.filter((s) => s.kind === "play");
const beatsOf = (segments: readonly Segment[]) => new Set(plays(segments).map((s) => s.beat));
const seconds = (s: Segment) => s.presentationEnd - s.presentationStart;
const beatDuration = (segments: readonly Segment[], beat: number | undefined) =>
  plays(segments)
    .filter((s) => s.beat === beat)
    .reduce((sum, s) => sum + seconds(s), 0);

describe("beats", () => {
  it("groups a quiet run of passes into one beat", () => {
    const { segments } = buildTimeline(log(...quietRun(12)), "full");
    expect(beatsOf(segments).size).toBe(1);
    expect(plays(segments)).toHaveLength(12);
  });

  it("ends a beat at a shot", () => {
    const events = log(...quietRun(4), aShot({ time: 12 }), ...quietRun(4, 15));
    const { segments } = buildTimeline(events, "full");
    const shot = plays(segments).find((s) => s.eventIndex === 4);
    expect(shot?.beat).toBeUndefined();
    expect(beatsOf(segments).size).toBe(3);
  });

  it("ends a beat at a set piece, a foul and a period change", () => {
    for (const interruption of [
      aSetPiece({ time: 12, variant: "corner" }),
      aFoul({ time: 12 }),
      aPeriodChange(12, "halfTime"),
    ]) {
      const events = [
        ...quietRun(4),
        interruption,
        ...quietRun(4, 15),
        aPeriodChange(30, "fullTime"),
      ];
      const { segments } = buildTimeline(events, "full");
      const beats = beatsOf(segments);
      beats.delete(undefined);
      expect(beats.size, interruption.type).toBe(2);
    }
  });

  it("ends a beat when the ball reaches the active zone and shows that action on its own", () => {
    const events = log(
      ...quietRun(4),
      aPass({ time: 12, ...nearGoal }),
      aPass({ time: 15, ...nearGoal }),
    );
    const { segments } = buildTimeline(events, "full");
    const near = plays(segments).filter((s) => s.eventIndex >= 4);
    expect(near.every((s) => s.beat === undefined && s.moment)).toBe(true);
    expect(plays(segments).filter((s) => s.beat !== undefined)).toHaveLength(4);
  });

  it("splits a beat that spans more than the longest allowed match time", () => {
    const run = quietRun(40, 0, 5);
    const { segments } = buildTimeline(log(...run), "full");
    expect(beatsOf(segments).size).toBeGreaterThan(1);
    for (const beat of beatsOf(segments)) {
      const own = plays(segments).filter((s) => s.beat === beat);
      const span = (own.at(-1)?.matchEnd ?? 0) - (own[0]?.matchStart ?? 0);
      expect(span).toBeLessThanOrEqual(BEAT_SETTINGS.full.maxSpan + 5);
    }
  });

  it("gives every beat between the minimum and maximum duration of its mode", () => {
    for (const mode of PLAYBACK_MODES) {
      const { minDuration, maxDuration } = BEAT_SETTINGS[mode];
      for (const seed of SEEDS.slice(0, 4)) {
        const { segments } = buildTimeline(seededMatchEvents(seed), mode);
        for (const beat of beatsOf(segments)) {
          if (beat === undefined) continue;
          const duration = beatDuration(segments, beat);
          const size = plays(segments).filter((s) => s.beat === beat).length;
          if (size > 1)
            expect(duration, `${mode} beat ${beat}`).toBeGreaterThanOrEqual(minDuration - 1e-9);
          expect(duration, `${mode} beat ${beat}`).toBeLessThanOrEqual(maxDuration + 1e-9);
        }
      }
    }
  });

  it("plays the actions between the key actions at one speed", () => {
    const { segments } = buildTimeline(log(...quietRun(12)), "full");
    const rest = plays(segments).filter((s) => !s.moment);
    expect(rest.length).toBeGreaterThan(0);
    const rates = rest.map((s) => (s.matchEnd - s.matchStart) / seconds(s));
    for (const rate of rates) expect(rate).toBeCloseTo(rates[0] as number, 6);
  });

  it("holds the per-action minimum for every action with its own moment in full mode", () => {
    for (const seed of SEEDS) {
      const events = seededMatchEvents(seed);
      const { segments } = buildTimeline(events, "full");
      for (const s of plays(segments)) {
        const event = events[s.eventIndex];
        if (!s.moment || !event) continue;
        expect(seconds(s), `seed ${seed} #${s.eventIndex}`).toBeGreaterThanOrEqual(
          MIN_DURATION[event.type] - 1e-9,
        );
      }
    }
  });

  it("never lets a beat skip a shot or a goal", () => {
    for (const mode of PLAYBACK_MODES) {
      const events = seededMatchEvents(1);
      const { segments } = buildTimeline(events, mode);
      events.forEach((e, i) => {
        if (e.type !== "shot") return;
        const play = plays(segments).find((s) => s.eventIndex === i);
        expect(play?.moment, `${mode} #${i}`).toBe(true);
      });
    }
  });
});
