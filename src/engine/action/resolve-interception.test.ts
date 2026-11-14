import { describe, expect, it } from "vitest";
import { createRng } from "../rng";
import { anEnginePlayer } from "./action-builders";
import { resolveInterception } from "./resolve-interception";

const scripted = (value: number) => ({ ...createRng(1), next: () => value });
const at = (x: number, y = 34) => ({ x, y });
const challenger = (positioning: number, workRate: number) => ({
  slot: 4,
  point: at(55, 35),
  player: anEnginePlayer("d")
    .withAttribute("positioning", positioning)
    .withAttribute("workRate", workRate)
    .build(),
});

describe("resolveInterception", () => {
  it("wins the ball at the interceptor's position when the draw succeeds", () => {
    const r = resolveInterception(
      { side: "home", interceptor: challenger(10, 10), pressure: 0 },
      scripted(0.1),
    );
    expect(r).toEqual({ outcome: "won", ball: at(55, 35), possession: { side: "away", slot: 4 } });
  });

  it("misses when the draw fails and leaves the ball where it is unowned by the interceptor", () => {
    const r = resolveInterception(
      { side: "home", interceptor: challenger(10, 10), pressure: 0 },
      scripted(0.9),
    );
    expect(r.outcome).toBe("missed");
  });

  it("wins more often with better positioning and work rate and under more pressure on the passer", () => {
    const wins = (c: ReturnType<typeof challenger>, pressure: number, draw: number) =>
      resolveInterception({ side: "home", interceptor: c, pressure }, scripted(draw)).outcome ===
      "won";
    expect(wins(challenger(10, 10), 0, 0.3)).toBe(false);
    expect(wins(challenger(20, 20), 0, 0.3)).toBe(true);
    expect(wins(challenger(10, 10), 1, 0.3)).toBe(true);
  });

  it("clamps the chance to named bounds", () => {
    expect(wins(challenger(1, 1), 0, 0.04)).toBe(true);
    expect(wins(challenger(1, 1), 0, 0.06)).toBe(false);
    expect(wins(challenger(20, 20), 1, 0.64)).toBe(true);
    expect(wins(challenger(20, 20), 1, 0.66)).toBe(false);
    function wins(c: ReturnType<typeof challenger>, pressure: number, draw: number) {
      return (
        resolveInterception({ side: "home", interceptor: c, pressure }, scripted(draw)).outcome ===
        "won"
      );
    }
  });
});
