import * as fc from "fast-check";
import { describe, expect, it } from "vitest";
import { aTeamSheet } from "../action/action-builders";
import { SNAPSHOT_PLAYER_COUNT } from "../action/action-event";
import { arbSeed, propertyRuns } from "../action/arbitraries";
import { inPitch } from "../action/pitch-metres";
import { toPhases } from "../action/to-phases";
import { arbSteps } from "./arbitraries";
import { toActionEvents } from "./to-action-events";

const sheets = { home: aTeamSheet("Home", "h").build(), away: aTeamSheet("Away", "a").build() };
const options = { sheets };
const runs = propertyRuns(25);

describe("toActionEvents properties", () => {
  it("derives one shot per chance and one goal per chance with the result goal", () => {
    fc.assert(
      fc.property(arbSteps, arbSeed, (steps, seed) => {
        const events = toActionEvents(steps, seed, { ...options, detail: "fast" });
        const chances = steps.flatMap((s) => (s.outcome === "chance" ? [s.chance] : []));
        const shots = events.filter((e) => e.type === "shot");

        expect(shots).toHaveLength(chances.length);
        expect(shots.filter((e) => e.outcome === "goal")).toHaveLength(
          chances.filter((c) => c.result === "goal").length,
        );
        expect(shots.map((e) => e.type === "shot" && e.xg)).toEqual(chances.map((c) => c.xg));
      }),
      { numRuns: runs },
    );
  });

  it("keeps the log's invariants: ball and players on the pitch, time never decreasing, events inside their step", () => {
    fc.assert(
      fc.property(arbSteps, arbSeed, (steps, seed) => {
        const events = toActionEvents(steps, seed, options);
        const times = events.map((e) => e.time);

        expect(times).toEqual([...times].sort((a, b) => a - b));
        for (const event of events) {
          expect(inPitch(event.from)).toBe(true);
          expect(inPitch(event.to)).toBe(true);
          expect(event.snapshot?.players).toHaveLength(SNAPSHOT_PLAYER_COUNT);
          expect(event.snapshot?.players.every(inPitch)).toBe(true);
          expect(event.snapshot && inPitch(event.snapshot.ball)).toBe(true);
        }
        const first = steps[0];
        const last = steps[steps.length - 1];
        expect(Math.min(...times)).toBe(first?.startTime);
        expect(Math.max(...times)).toBe(last?.endTime);
      }),
      { numRuns: runs },
    );
  });

  it("is deterministic and never changes the steps", () => {
    fc.assert(
      fc.property(arbSteps, arbSeed, (steps, seed) => {
        const before = JSON.stringify(steps);

        expect(toActionEvents(steps, seed, options)).toEqual(toActionEvents(steps, seed, options));
        expect(JSON.stringify(steps)).toBe(before);
      }),
      { numRuns: runs },
    );
  });

  it("gives toPhases back the steps' boundaries", () => {
    fc.assert(
      fc.property(arbSteps, arbSeed, (steps, seed) => {
        const events = toActionEvents(steps, seed, { ...options, detail: "fast" });
        const phases = toPhases(events).filter((p) =>
          p.actions.some((i) => events[i]?.type !== "periodChange"),
        );

        expect(phases.map((p) => [p.team, p.period, p.startTime, p.endTime])).toEqual(
          steps.map((s) => [s.team, s.period, s.startTime, s.endTime]),
        );
      }),
      { numRuns: runs },
    );
  });
});
