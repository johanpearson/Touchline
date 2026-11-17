import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useOpenState } from "./use-open-state";

describe("useOpenState", () => {
  it("starts closed and follows defaultOpen", () => {
    expect(renderHook(() => useOpenState({})).result.current[0]).toBe(false);
    expect(renderHook(() => useOpenState({ defaultOpen: true })).result.current[0]).toBe(true);
  });

  it("keeps its own state when uncontrolled and reports changes", () => {
    const onOpenChange = vi.fn();
    const { result } = renderHook(() => useOpenState({ onOpenChange }));
    act(() => result.current[1](true));
    expect(result.current[0]).toBe(true);
    expect(onOpenChange).toHaveBeenCalledWith(true);
  });

  it("follows the open prop when controlled", () => {
    const onOpenChange = vi.fn();
    const { result } = renderHook(() => useOpenState({ open: false, onOpenChange }));
    act(() => result.current[1](true));
    expect(result.current[0]).toBe(false);
    expect(onOpenChange).toHaveBeenCalledWith(true);
  });
});
