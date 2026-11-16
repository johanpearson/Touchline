import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createActionMatch, NEUTRAL_TACTICS } from "../../engine";
import { anActionMatchSetup } from "./action-match-fixture";
import { useMatchPlayback } from "./use-match-playback";

describe("useMatchPlayback", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval", "performance"] });
  });
  afterEach(() => vi.useRealTimers());

  const actionMatch = () => {
    const { setup } = anActionMatchSetup();
    return createActionMatch(setup.input, setup.seed);
  };

  it("keeps the full event list and appends only new events as the match advances", () => {
    const match = actionMatch();
    const { result } = renderHook(() => useMatchPlayback(match, 1000));
    const first = result.current.events;
    act(() => vi.advanceTimersByTime(3000));
    const afterFirst = result.current.eventCount;
    expect(afterFirst).toBeGreaterThan(1);
    expect(result.current.events).toBe(first);
    act(() => vi.advanceTimersByTime(3000));
    expect(result.current.eventCount).toBeGreaterThan(afterFirst);
    expect(result.current.events).toHaveLength(result.current.eventCount);
    expect(result.current.events).toEqual(match.events.slice(0, result.current.eventCount));
  });

  it("applies a change before the second half starts", () => {
    const match = actionMatch();
    match.advanceTo(1_000_000);
    const { result } = renderHook(() => useMatchPlayback(match, 1000));
    const tactics = { ...NEUTRAL_TACTICS, tempo: "fast" } as const;
    act(() => result.current.resume({ side: "home", tactics }));
    expect(match.changes).toHaveLength(1);
    expect(match.state.period).toBe("secondHalf");
    expect(result.current.events).toEqual(match.events);
  });
});
