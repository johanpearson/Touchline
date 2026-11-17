import { describe, expect, it } from "vitest";
import { DURATION } from "./tokens";
import { variantFor } from "./variants";

describe("variantFor", () => {
  it("slides up by 8 px with the base duration", () => {
    const v = variantFor("slideUp", false);
    expect(v.initial.y).toBe(8);
    expect(v.transition.duration).toBe(DURATION.base);
  });

  it("scales in slightly", () => {
    expect(variantFor("scale", false).initial.scale).toBe(0.98);
  });

  it.each(["fade", "slideUp", "scale"] as const)(
    "%s only changes opacity with reduced motion",
    (name) => {
      const v = variantFor(name, true);
      expect(v.initial).toEqual({ opacity: 0 });
      expect(v.animate).toEqual({ opacity: 1 });
      expect(v.transition.duration).toBe(DURATION.fast);
    },
  );

  it("orders the named durations from fast to slow", () => {
    expect(DURATION.fast).toBeLessThan(DURATION.base);
    expect(DURATION.base).toBeLessThan(DURATION.slow);
  });
});
