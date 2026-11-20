import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createActionMatch, NEUTRAL_TACTICS } from "../../engine";
import { anActionMatchSetup } from "./action-match-fixture";
import { buildTimeline } from "./director";
import { LOOKAHEAD_SECONDS } from "./playback";
import { useMatchPlayback } from "./use-match-playback";

describe("useMatchPlayback", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval", "performance"] });
    window.localStorage.clear();
  });
  afterEach(() => vi.useRealTimers());

  const actionMatch = () => {
    const { setup } = anActionMatchSetup();
    return createActionMatch(setup.input, setup.seed);
  };
  const play = (seconds: number) => act(() => vi.advanceTimersByTime(seconds * 1000));
  const playToHalfTime = (result: { current: { state: { period: string } } }) => {
    for (let i = 0; i < 400 && result.current.state.period !== "halfTime"; i++) play(1);
  };

  it("keeps the full event list and appends only new events as the match advances", () => {
    const match = actionMatch();
    const { result } = renderHook(() => useMatchPlayback(match, 1000));
    const first = result.current.events;
    play(3);
    const afterFirst = result.current.eventCount;
    expect(afterFirst).toBeGreaterThan(1);
    expect(result.current.events).toBe(first);
    play(3);
    expect(result.current.eventCount).toBeGreaterThan(afterFirst);
    expect(result.current.events).toEqual(match.events.slice(0, result.current.events.length));
  });

  it("derives the match time from the director's timeline at the presentation clock", () => {
    const match = actionMatch();
    const { result } = renderHook(() => useMatchPlayback(match, 1000));
    play(30);
    const timeline = buildTimeline(match.events, "extended");
    expect(result.current.matchTime).toBeCloseTo(timeline.matchTimeAt(30), 5);
    expect(result.current.matchTime).toBeGreaterThan(0);
  });

  it("starts in Extended mode", () => {
    const { result } = renderHook(() => useMatchPlayback(actionMatch(), 1000));
    expect(result.current.mode).toBe("extended");
  });

  it("reads the engine ahead of the clock by the lookahead and no further than needed", () => {
    const match = actionMatch();
    const { result } = renderHook(() => useMatchPlayback(match, 1000));
    play(20);
    const timeline = buildTimeline(match.events, "extended");
    expect(timeline.duration).toBeGreaterThanOrEqual(20 + LOOKAHEAD_SECONDS);
    expect(match.state.time).toBeLessThan(result.current.matchTime + 120);
    expect(match.state.time).toBeGreaterThanOrEqual(result.current.matchTime);
  });

  it("shows the score and event count at the clock, not the engine's", () => {
    const match = actionMatch();
    const { result } = renderHook(() => useMatchPlayback(match, 1000));
    play(10);
    expect(result.current.eventCount).toBeLessThanOrEqual(match.events.length);
    for (const event of result.current.events.slice(0, result.current.eventCount)) {
      expect(event.time).toBeLessThanOrEqual(result.current.matchTime);
    }
  });

  it("does not advance while paused and continues from the same place", () => {
    const match = actionMatch();
    const { result } = renderHook(() => useMatchPlayback(match, 1000));
    play(10);
    act(() => result.current.setPaused(true));
    const held = result.current.matchTime;
    const engineTime = match.state.time;
    play(60);
    expect(result.current.matchTime).toBe(held);
    expect(match.state.time).toBe(engineTime);
    act(() => result.current.setPaused(false));
    play(10);
    expect(result.current.matchTime).toBeGreaterThan(held);
  });

  it("stops the clock at half-time until the second half is started", () => {
    const match = actionMatch();
    const { result } = renderHook(() => useMatchPlayback(match, 1000));
    act(() => result.current.setMode("highlights"));
    playToHalfTime(result);
    expect(result.current.state.period).toBe("halfTime");
    const held = result.current.matchTime;
    play(30);
    expect(result.current.matchTime).toBe(held);
    expect(result.current.state.period).toBe("halfTime");
  });

  it("continues in the chosen mode after half-time and reaches full time", () => {
    const match = actionMatch();
    const { result } = renderHook(() => useMatchPlayback(match, 1000));
    act(() => result.current.setMode("highlights"));
    playToHalfTime(result);
    act(() => result.current.resume());
    expect(result.current.state.period).toBe("secondHalf");
    expect(result.current.mode).toBe("highlights");
    play(200);
    expect(result.current.state.period).toBe("fullTime");
    expect(result.current.state.score).toEqual(match.state.score);
    expect(result.current.eventCount).toBe(match.events.length);
  });

  it("plays a match through in less presentation time in Highlights than in Full match", () => {
    const secondsTo = (mode: "highlights" | "full", seconds: number) => {
      const { result } = renderHook(() => useMatchPlayback(actionMatch(), 1000));
      act(() => result.current.setMode(mode));
      play(seconds);
      return result.current.matchTime;
    };
    expect(secondsTo("highlights", 30)).toBeGreaterThan(secondsTo("full", 30));
  });

  it("switches mode in the middle of a match without moving the match clock", () => {
    const match = actionMatch();
    const { result } = renderHook(() => useMatchPlayback(match, 1000));
    play(40);
    const before = result.current.matchTime;
    const counted = result.current.eventCount;
    act(() => result.current.setMode("full"));
    expect(result.current.mode).toBe("full");
    expect(result.current.matchTime).toBeGreaterThanOrEqual(before);
    expect(result.current.matchTime - before).toBeLessThan(2);
    expect(result.current.eventCount).toBeGreaterThanOrEqual(counted);
    play(5);
    expect(result.current.matchTime).toBeGreaterThan(before);
  });

  it("remembers the mode for the next match", () => {
    const first = renderHook(() => useMatchPlayback(actionMatch(), 1000));
    act(() => first.result.current.setMode("full"));
    first.unmount();
    const second = renderHook(() => useMatchPlayback(actionMatch(), 1000));
    expect(second.result.current.mode).toBe("full");
  });

  it("applies a change before the second half starts", () => {
    const match = actionMatch();
    match.advanceTo(1_000_000);
    const { result } = renderHook(() => useMatchPlayback(match, 1000));
    const tactics = { ...NEUTRAL_TACTICS, tempo: "fast" } as const;
    act(() => result.current.setMode("highlights"));
    playToHalfTime(result);
    act(() => result.current.resume({ side: "home", tactics }));
    expect(match.changes).toHaveLength(1);
    expect(match.state.period).toBe("secondHalf");
  });

  describe("applyChange", () => {
    const fast = { side: "home", tactics: { ...NEUTRAL_TACTICS, tempo: "fast" } } as const;

    it("applies a change while the match is on and records it at the engine time", () => {
      const match = actionMatch();
      const { result } = renderHook(() => useMatchPlayback(match, 1000));
      play(10);
      act(() => result.current.setPaused(true));
      const time = match.state.time;
      let applied: number | undefined;
      act(() => {
        applied = result.current.applyChange(fast);
      });
      expect(applied).toBe(time);
      expect(match.changes).toEqual([{ time, change: fast }]);
      expect(result.current.userChanges).toEqual([{ time, change: fast }]);
      expect(result.current.userChangeCount).toBe(1);
    });

    it("keeps the match at half-time when a change is applied there", () => {
      const match = actionMatch();
      const { result } = renderHook(() => useMatchPlayback(match, 1000));
      act(() => result.current.setMode("highlights"));
      playToHalfTime(result);
      act(() => {
        result.current.applyChange(fast);
      });
      expect(match.state.period).toBe("halfTime");
      expect(result.current.userChangeCount).toBe(1);
    });

    it("refuses a change at full time", () => {
      const match = actionMatch();
      match.advanceTo(1_000_000);
      match.resume();
      match.advanceTo(1_000_000);
      const { result } = renderHook(() => useMatchPlayback(match, 1000));
      let applied: number | undefined = 1;
      act(() => {
        applied = result.current.applyChange(fast);
      });
      expect(applied).toBeUndefined();
      expect(result.current.userChangeCount).toBe(0);
    });

    it("refuses a change the engine rejects without recording it", () => {
      const match = actionMatch();
      const { result } = renderHook(() => useMatchPlayback(match, 1000));
      let applied: number | undefined = 1;
      act(() => {
        applied = result.current.applyChange({ side: "home", lineup: [] });
      });
      expect(applied).toBeUndefined();
      expect(result.current.userChanges).toEqual([]);
    });
  });

  describe("restored from a session", () => {
    const restoredAt = (matchTime: number) => {
      const original = actionMatch();
      const { result: running } = renderHook(() => useMatchPlayback(original, 1000));
      for (let i = 0; i < 200 && running.current.matchTime < matchTime; i++) play(1);
      const saved = running.current.matchTime;
      const resumed = actionMatch();
      resumed.advanceTo(saved);
      const { result } = renderHook(() =>
        useMatchPlayback(resumed, 1000, { matchTime: saved, mode: "extended", changes: [] }),
      );
      return { running: running.current, result, saved };
    };

    it("starts paused at the saved match time with the same score and event count", () => {
      const { running, result, saved } = restoredAt(600);
      expect(result.current.paused).toBe(true);
      expect(result.current.matchTime).toBeCloseTo(saved, 3);
      expect(result.current.eventCount).toBe(running.eventCount);
      expect(result.current.state).toEqual(running.state);
      play(10);
      expect(result.current.matchTime).toBeCloseTo(saved, 3);
    });

    it("plays on from the saved time once started", () => {
      const { result, saved } = restoredAt(600);
      act(() => result.current.setPaused(false));
      play(20);
      expect(result.current.matchTime).toBeGreaterThan(saved + 1);
    });

    it("uses the saved mode instead of the remembered one", () => {
      window.localStorage.setItem("touchline.playback-mode", "full");
      const match = actionMatch();
      match.advanceTo(300);
      const { result } = renderHook(() =>
        useMatchPlayback(match, 1000, { matchTime: 300, mode: "highlights", changes: [] }),
      );
      expect(result.current.mode).toBe("highlights");
    });

    it("keeps the restored changes and adds the half-time change at the engine time it was made", () => {
      const match = actionMatch();
      const { result } = renderHook(() => useMatchPlayback(match, 1000));
      playToHalfTime(result);
      const halfTime = match.state.time;
      const change = {
        side: "home" as const,
        tactics: { ...NEUTRAL_TACTICS, tempo: "fast" as const },
      };
      act(() => result.current.resume(change));
      expect(result.current.userChanges).toEqual([{ time: halfTime, change }]);
      expect(result.current.userChangeCount).toBe(1);
    });

    it("does not record a change the engine rejects", () => {
      const match = actionMatch();
      const { result } = renderHook(() => useMatchPlayback(match, 1000));
      playToHalfTime(result);
      act(() => result.current.resume({ side: "home", lineup: [] }));
      expect(result.current.userChanges).toEqual([]);
    });
  });
});
