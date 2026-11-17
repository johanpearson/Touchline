import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useChangeFlash } from "./use-change-flash";

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("useChangeFlash", () => {
  it("does not flash on the first render", () => {
    const { result } = renderHook(() => useChangeFlash(3));
    expect(result.current).toBe(false);
  });

  it("flashes when the value changes and stops after the duration", () => {
    const { result, rerender } = renderHook(({ v }) => useChangeFlash(v, 500), {
      initialProps: { v: 3 },
    });
    rerender({ v: 4 });
    expect(result.current).toBe(true);
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(result.current).toBe(false);
  });

  it("does not flash when the value stays the same", () => {
    const { result, rerender } = renderHook(({ v }) => useChangeFlash(v), {
      initialProps: { v: 3 },
    });
    rerender({ v: 3 });
    expect(result.current).toBe(false);
  });
});
