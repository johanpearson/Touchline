import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createMatch, type MatchInput, NEUTRAL_TACTICS } from "../../engine";
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

const input: MatchInput = {
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
