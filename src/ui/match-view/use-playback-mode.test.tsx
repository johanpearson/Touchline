import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { usePlaybackModeChoice } from "./use-playback-mode";

describe("usePlaybackModeChoice", () => {
  beforeEach(() => window.localStorage.clear());
  afterEach(() => vi.restoreAllMocks());

  it("defaults to Extended", () => {
    const { result } = renderHook(() => usePlaybackModeChoice());
    expect(result.current[0]).toBe("extended");
  });

  it("remembers the choice in the next mount", () => {
    const first = renderHook(() => usePlaybackModeChoice());
    act(() => first.result.current[1]("highlights"));
    first.unmount();
    const second = renderHook(() => usePlaybackModeChoice());
    expect(second.result.current[0]).toBe("highlights");
  });

  it("ignores a stored value that is not a mode", () => {
    window.localStorage.setItem("touchline.playback-mode", "x8");
    const { result } = renderHook(() => usePlaybackModeChoice());
    expect(result.current[0]).toBe("extended");
  });

  it("keeps the choice in memory when storage is unavailable", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    const first = renderHook(() => usePlaybackModeChoice());
    act(() => first.result.current[1]("full"));
    first.unmount();
    const second = renderHook(() => usePlaybackModeChoice());
    expect(second.result.current[0]).toBe("full");
  });
});
