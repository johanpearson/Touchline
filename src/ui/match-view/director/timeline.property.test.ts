import * as fc from "fast-check";
import { describe, expect, it } from "vitest";
import { PLAYBACK_MODES } from "./constants";
import { aCarry, aFoul, aPass, aPeriodChange, aSetPiece, aShot } from "./director-test-support";
import { buildTimeline } from "./timeline";

const arbEvent = fc
  .record({
    step: fc.double({ min: 0, max: 12, noNaN: true }),
    x: fc.double({ min: 0, max: 105, noNaN: true }),
    y: fc.double({ min: 0, max: 68, noNaN: true }),
    kind: fc.constantFrom("pass", "carry", "shot", "goal", "corner", "penalty", "foul", "throwIn"),
  })
  .map((e) => ({ ...e, step: Math.round(e.step * 10) / 10 }));

/** A random but valid log: non-decreasing times, ending in a period change. */
const arbLog = fc.array(arbEvent, { maxLength: 120 }).map((items) => {
  let time = 0;
  const events = items.map(({ step, kind, x, y }) => {
    time += step;
    const base = { time, x, y };
    if (kind === "pass") return aPass(base);
    if (kind === "carry") return aCarry(base);
    if (kind === "shot") return aShot(base);
    if (kind === "goal") return aShot({ ...base, outcome: "goal" });
    if (kind === "foul") return aFoul({ ...base, outcome: "penalty" });
    return aSetPiece({ ...base, variant: kind === "throwIn" ? "throwIn" : kind });
  });
  return [...events, aPeriodChange(time + 2, "halfTime")];
});

const samples = (duration: number): number[] =>
  Array.from({ length: 61 }, (_, i) => (duration * (i - 3)) / 55);

describe("timeline properties", () => {
  it("maps presentation time to match time monotonically and totally", () => {
    fc.assert(
      fc.property(arbLog, fc.constantFrom(...PLAYBACK_MODES), (events, mode) => {
        const timeline = buildTimeline(events, mode);
        let previous = Number.NEGATIVE_INFINITY;
        for (const p of samples(timeline.duration)) {
          const m = timeline.matchTimeAt(p);
          expect(Number.isFinite(m)).toBe(true);
          expect(m).toBeGreaterThanOrEqual(previous);
          expect(m).toBeLessThanOrEqual(timeline.matchEnd);
          previous = m;
        }
        expect(timeline.matchTimeAt(timeline.duration)).toBe(timeline.matchEnd);
      }),
      { numRuns: 100, seed: 20_261_119 },
    );
  });

  it("maps match time to presentation time monotonically and within the duration", () => {
    fc.assert(
      fc.property(arbLog, fc.constantFrom(...PLAYBACK_MODES), (events, mode) => {
        const timeline = buildTimeline(events, mode);
        let previous = Number.NEGATIVE_INFINITY;
        for (const s of samples(timeline.matchEnd)) {
          const p = timeline.presentationTimeAt(s);
          expect(p).toBeGreaterThanOrEqual(previous);
          expect(p).toBeLessThanOrEqual(timeline.duration + 1e-9);
          previous = p;
        }
      }),
      { numRuns: 100, seed: 20_261_119 },
    );
  });

  it("covers the whole log without gaps in match time", () => {
    fc.assert(
      fc.property(arbLog, fc.constantFrom(...PLAYBACK_MODES), (events, mode) => {
        const { segments, matchEnd } = buildTimeline(events, mode);
        const first = segments[0];
        const last = segments.at(-1);
        if (!first || !last) return;
        expect(first.matchStart).toBe(events[0]?.time);
        expect(last.matchEnd).toBe(matchEnd);
      }),
      { numRuns: 100, seed: 20_261_119 },
    );
  });
});
