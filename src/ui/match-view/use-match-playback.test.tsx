import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createMatch, type MatchInputV1, type MatchInputV2, NEUTRAL_TACTICS } from "../../engine";
import { anActionMatchSetup } from "./action-match-fixture";
import { useMatchPlayback } from "./use-match-playback";

const profile = (name: string) => ({
  name,
  buildUp: 0.5,
  progression: 0.5,
  chanceCreation: 0.5,
  finishing: 0.5,
  pressing: 0.5,
  defending: 0.5,
  goalkeeping: 0.5,
});

const input: MatchInputV1 = {
  home: profile("Kvarnby"),
  away: profile("Västerås Park"),
  homeTactics: NEUTRAL_TACTICS,
  awayTactics: NEUTRAL_TACTICS,
};

describe("useMatchPlayback resume", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval", "performance"] });
  });
  afterEach(() => vi.useRealTimers());

  const atHalfTime = () => {
    const match = createMatch(input, 7);
    match.advanceTo(1_000_000);
    return match;
  };

  it("applies the change to the match before the second half starts", () => {
    const match = atHalfTime();
    const { result } = renderHook(() => useMatchPlayback(match, 1000));
    const tactics = { ...NEUTRAL_TACTICS, mentality: "attacking" } as const;
    act(() => result.current.resume({ side: "home", tactics }));
    expect(match.changes).toHaveLength(1);
    expect(match.changes[0]?.change.tactics).toEqual(tactics);
    expect(match.state.period).toBe("secondHalf");
  });

  it("applies no change when resumed without one", () => {
    const match = atHalfTime();
    const { result } = renderHook(() => useMatchPlayback(match, 1000));
    act(() => result.current.resume());
    expect(match.changes).toHaveLength(0);
    expect(match.state.period).toBe("secondHalf");
  });
});

describe("useMatchPlayback with the action engine", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval", "performance"] });
  });
  afterEach(() => vi.useRealTimers());

  const actionMatch = () => {
    const { setup } = anActionMatchSetup();
    return createMatch(setup.input as MatchInputV2, setup.seed);
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

  it("applies an action-engine change before the second half starts", () => {
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
