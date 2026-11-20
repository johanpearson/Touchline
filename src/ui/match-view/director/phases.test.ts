import { describe, expect, it } from "vitest";
import { type ActionEvent, toPhases } from "../../../engine";
import { MIN_DURATION, PHASE_SETTINGS, PLAYBACK_MODES } from "./constants";
import {
  aPass,
  aPeriodChange,
  aShot,
  quietRun,
  SEEDS,
  seededMatchEvents,
} from "./director-test-support";
import { buildTimeline, extendTimeline, type Segment } from "./timeline";

const log = (...events: ActionEvent[]): ActionEvent[] => {
  const last = events.at(-1);
  return [...events, aPeriodChange((last?.time ?? 0) + 3, "halfTime")];
};

const plays = (segments: readonly Segment[]) => segments.filter((s) => s.kind === "play");
const seconds = (s: Segment) => s.presentationEnd - s.presentationStart;
const phasesOf = (segments: readonly Segment[]): Map<number, Segment[]> => {
  const byPhase = new Map<number, Segment[]>();
  for (const s of plays(segments)) byPhase.set(s.phase, [...(byPhase.get(s.phase) ?? []), s]);
  return byPhase;
};

describe("phase playback", () => {
  it("plays a quiet run of one side's passes as one phase with one ending moment", () => {
    const { segments } = buildTimeline(log(...quietRun(12)), "full");
    const phases = phasesOf(segments);
    expect(phases.size).toBe(1);
    expect(plays(segments).filter((s) => s.moment)).toHaveLength(1);
    expect(plays(segments).at(-1)?.moment).toBe(true);
  });

  it("plays the build-up of a phase at one steady pace without a pause between passes", () => {
    const { segments } = buildTimeline(log(...quietRun(12)), "full");
    const build = plays(segments).filter((s) => !s.moment);
    expect(build).toHaveLength(11);
    const rates = build.map((s) => (s.matchEnd - s.matchStart) / seconds(s));
    for (const rate of rates) expect(rate).toBeCloseTo(rates[0] as number, 6);
    for (let i = 1; i < build.length; i += 1)
      expect((build[i] as Segment).presentationStart).toBeCloseTo(
        (build[i - 1] as Segment).presentationEnd,
        9,
      );
  });

  it("gives only the shot that ends a phase its own moment and hold", () => {
    const events = log(...quietRun(5), aShot({ time: 15 }));
    const { segments } = buildTimeline(events, "full");
    expect(
      plays(segments)
        .filter((s) => s.moment)
        .map((s) => s.eventIndex),
    ).toEqual([5]);
    expect(segments.some((s) => s.kind === "hold")).toBe(true);
  });

  it("starts a new phase when the other side wins the ball", () => {
    const away = (time: number) => ({ ...aPass({ time }), team: "away" as const });
    const events = log(
      ...quietRun(4),
      ...[12, 15, 18, 21].map(away),
      ...quietRun(4, 24),
      ...[36, 39, 42, 45].map(away),
    );
    expect(phasesOf(buildTimeline(events, "full").segments).size).toBeGreaterThan(1);
  });

  it("keeps the build-up of every phase between the mode's minimum and maximum", () => {
    for (const mode of PLAYBACK_MODES) {
      const { minBuildUp, maxBuildUp } = PHASE_SETTINGS[mode];
      for (const seed of SEEDS.slice(0, 4)) {
        const { segments } = buildTimeline(seededMatchEvents(seed), mode);
        for (const own of phasesOf(segments).values()) {
          const build = own.filter((s) => !s.moment).reduce((sum, s) => sum + seconds(s), 0);
          expect(build, `${mode} seed ${seed}`).toBeLessThanOrEqual(maxBuildUp + 1e-9);
          if (build > 0)
            expect(build, `${mode} seed ${seed}`).toBeGreaterThanOrEqual(minBuildUp - 1e-9);
        }
      }
    }
  });

  it("holds the per-action minimum for every action with its own moment in full mode", () => {
    for (const seed of SEEDS) {
      const events = seededMatchEvents(seed);
      for (const s of plays(buildTimeline(events, "full").segments)) {
        const event = events[s.eventIndex];
        if (!s.moment || !event) continue;
        expect(seconds(s), `seed ${seed} #${s.eventIndex}`).toBeGreaterThanOrEqual(
          MIN_DURATION[event.type] - 1e-9,
        );
      }
    }
  });

  it("shows every phase in full and extended and only phases with a shot or key moment in highlights", () => {
    const events = seededMatchEvents(1);
    const phases = toPhases(events).filter((p) =>
      p.actions.some((i) => events[i]?.type !== "periodChange"),
    );
    const shown = (mode: "full" | "highlights") =>
      phasesOf(buildTimeline(events, mode).segments).size;
    expect(shown("full")).toBe(phases.length);
    expect(shown("highlights")).toBeLessThan(phases.length);
  });

  it("commits a phase only when no later event can change it, whatever the size of the log's chunks", () => {
    for (const seed of SEEDS) {
      const events = seededMatchEvents(seed);
      const whole = buildTimeline(events, "full");
      for (const chunk of [1, 13]) {
        let timeline = buildTimeline([], "full");
        for (let i = 0; i < events.length; i += chunk)
          timeline = extendTimeline(timeline, events.slice(i, i + chunk));
        expect(timeline.segments, `seed ${seed} chunk ${chunk}`).toEqual(whole.segments);
      }
    }
  });
});
