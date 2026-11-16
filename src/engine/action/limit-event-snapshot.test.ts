import { describe, expect, it } from "vitest";
import { periodChange, setPiece } from "./action-event-builders";
import { advanceLoop } from "./advance-loop";
import { limitEventSnapshot } from "./limit-event-snapshot";
import { aStartedLoop } from "./loop-builders";

describe("limitEventSnapshot", () => {
  const { state, context } = aStartedLoop(9);
  advanceLoop(state, 400, context);
  const events = context.events;
  const input = state.input;

  it("returns an event that engine already limited as it is, for every event of a played match", () => {
    for (let i = 1; i < events.length; i++) {
      expect(limitEventSnapshot(events[i] as never, events[i - 1], input)).toEqual(events[i]);
    }
  });

  it("returns the first event, which has nothing before it, as it is", () => {
    const [first] = events;
    expect(limitEventSnapshot(first as never, undefined, input)).toBe(first);
  });

  it("returns a restart and a period change as they are, whatever came before", () => {
    const before = events.at(-1);
    const restart = setPiece("home", "h1", "throwIn", { time: 500 });
    const half = periodChange(2700, "halfTime");

    expect(limitEventSnapshot(restart, before, input)).toBe(restart);
    expect(limitEventSnapshot(half, before, input)).toBe(half);
  });

  it("returns an event without a snapshot (the fast path) as it is", () => {
    const fast = aStartedLoop(9, false);
    advanceLoop(fast.state, 400, fast.context);
    const [, second] = fast.context.events;

    expect(limitEventSnapshot(second as never, fast.context.events[0], fast.state.input)).toBe(
      second,
    );
  });

  it("caps the movement of the players at a sprint from the event before", () => {
    const open = events.filter(
      (e) => e.snapshot !== undefined && e.type !== "setPiece" && e.type !== "periodChange",
    );
    const event = open[3];
    const before = open[2];
    if (!event || !before || !event.snapshot || !before.snapshot)
      throw new Error("expected open-play events");
    const teleported = {
      ...event,
      snapshot: {
        ...event.snapshot,
        players: event.snapshot.players.map((p) => ({ x: p.x + 80, y: p.y })),
      },
    };

    const limited = limitEventSnapshot(teleported, before, input);

    limited.snapshot?.players.forEach((p, i) => {
      const from = before.snapshot?.players[i];
      const metres = Math.hypot(p.x - (from?.x ?? p.x), p.y - (from?.y ?? p.y));
      expect(metres).toBeLessThanOrEqual(10 * (event.time - before.time) + 1.6);
    });
  });
});
