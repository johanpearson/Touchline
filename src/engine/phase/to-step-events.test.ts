import { describe, expect, it } from "vitest";
import { aTeamSheet } from "../action/action-builders";
import { SNAPSHOT_PLAYER_COUNT } from "../action/action-event";
import { aStep } from "./phase-builders";
import { toActionEvents, toStepEvents } from "./to-action-events";

const sheets = { home: aTeamSheet("Home", "h").build(), away: aTeamSheet("Away", "a").build() };
const full = { sheets };
const fast = { sheets, detail: "fast" as const };

describe("toStepEvents presentation", () => {
  it("leaves the snapshots out in fast detail and draws them in full detail", () => {
    const step = aStep().build();

    for (const e of toStepEvents(step, 0, 1, fast)) expect(e.snapshot).toBeUndefined();
    for (const e of toStepEvents(step, 0, 1, full)) {
      expect(e.snapshot).toBeDefined();
      expect(e.snapshot?.players).toHaveLength(SNAPSHOT_PLAYER_COUNT);
    }
  });

  it("times the events in order inside the step, opening at its start and closing at its end", () => {
    const events = toStepEvents(aStep().between(100, 117.5).build(), 0, 3, fast);

    expect(events[0]?.time).toBe(100);
    expect(events.at(-1)?.time).toBe(117.5);
    expect(events.map((e) => e.time)).toEqual(events.map((e) => e.time).sort((a, b) => a - b));
  });

  it("gives a period change the end time of its step, and the other events times before it", () => {
    const events = toStepEvents(
      aStep().between(2700, 2712).endingAtPeriodEnd().build(),
      0,
      3,
      fast,
    );

    expect(events.at(-1)).toMatchObject({ type: "periodChange", time: 2712 });
    expect(events.slice(0, -1).every((e) => e.time <= 2712)).toBe(true);
    expect(events[0]?.time).toBe(2700);
  });

  it("draws a pressure between 0 and 0.6 with two decimals", () => {
    for (let index = 0; index < 20; index++) {
      for (const e of toStepEvents(aStep().build(), index, 5, fast)) {
        expect(e.pressure).toBeGreaterThanOrEqual(0);
        expect(e.pressure).toBeLessThanOrEqual(0.6);
        expect(Math.round(e.pressure * 100) / 100).toBe(e.pressure);
      }
    }
  });

  it("draws a step's events from its own stream: the same step gives the same events whatever came before", () => {
    const a = aStep().build();
    const b = aStep().forTeam("away").build();

    expect(toStepEvents(b, 1, 9, full)).toEqual(
      toActionEvents([a, b], 9, full).slice(-toStepEvents(b, 1, 9, full).length),
    );
    expect(toStepEvents(a, 0, 9, fast)).not.toEqual(toStepEvents(a, 1, 9, fast));
    expect(toStepEvents(a, 0, 9, fast)).not.toEqual(toStepEvents(a, 0, 10, fast));
  });

  it("builds the snapshots around the ball's end position", () => {
    for (const e of toStepEvents(aStep().build(), 0, 2, full)) {
      expect(e.snapshot?.ball).toEqual(e.to);
    }
  });
});
