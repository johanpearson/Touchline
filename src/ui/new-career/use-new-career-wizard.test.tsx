import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useNewCareerWizard } from "./use-new-career-wizard";

describe("useNewCareerWizard", () => {
  it("starts with the given seed and no league chosen", () => {
    const { result } = renderHook(() => useNewCareerWizard(7));
    expect(result.current.seed).toBe(7);
    expect(result.current.leagueId).toBeNull();
  });

  it("keeps the league and the seed between renders", () => {
    const { result, rerender } = renderHook(() => useNewCareerWizard(7));
    act(() => result.current.chooseLeague("first-division"));
    act(() => result.current.setSeed(42));
    rerender();
    expect(result.current.leagueId).toBe("first-division");
    expect(result.current.seed).toBe(42);
  });

  it("ignores a later change of the initial seed once the user has chosen one", () => {
    let initial = 7;
    const { result, rerender } = renderHook(() => useNewCareerWizard(initial));
    act(() => result.current.setSeed(42));
    initial = 9;
    rerender();
    expect(result.current.seed).toBe(42);
  });
});
