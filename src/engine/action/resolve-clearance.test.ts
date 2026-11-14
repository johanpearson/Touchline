import { describe, expect, it } from "vitest";
import { createRng } from "../rng";
import { anEnginePlayer } from "./action-builders";
import type { Challenger } from "./open-play-types";
import { type ClearanceInput, resolveClearance } from "./resolve-clearance";

const scripted = (value: number) => ({ ...createRng(1), next: () => value });
const at = (x: number, y = 34) => ({ x, y });
const challenger = (
  slot: number,
  point: { x: number; y: number },
  positioning = 10,
): Challenger => ({
  slot,
  point,
  player: anEnginePlayer(`c${slot}`).withAttribute("positioning", positioning).build(),
});
const input = (extra: Partial<ClearanceInput> = {}): ClearanceInput => ({
  side: "home",
  clearer: anEnginePlayer("k").build(),
  clearerSlot: 2,
  from: at(20, 34),
  pressure: 0,
  teammates: [challenger(8, at(45, 34))],
  opponents: [challenger(9, at(80, 34))],
  ...extra,
});

describe("resolveClearance", () => {
  it("sends the ball upfield and gives it to the player who reaches it first", () => {
    const r = resolveClearance(input(), scripted(0.9));
    expect(r.outcome).toBe("kept");
    expect(r.ball.x).toBeCloseTo(50, 6);
    expect(r.possession).toEqual({ side: "home", slot: 8 });
  });

  it("can be won by an opponent near where the ball lands", () => {
    const r = resolveClearance(
      input({ opponents: [challenger(9, at(46, 34))], teammates: [challenger(8, at(70, 34))] }),
      scripted(0.9),
    );
    expect(r.possession).toEqual({ side: "away", slot: 9 });
  });

  it("lets a better-positioned player reach the ball from further away", () => {
    const r = resolveClearance(
      input({
        teammates: [challenger(8, at(52, 34), 20)],
        opponents: [challenger(9, at(47, 34), 1)],
      }),
      scripted(0.9),
    );
    expect(r.possession.side).toBe("home");
  });

  it("goes further for stronger clearers and stays on the pitch", () => {
    const strong = anEnginePlayer("k").withAttribute("strength", 20).build();
    expect(resolveClearance(input({ clearer: strong }), scripted(0.9)).ball.x).toBeGreaterThan(45);
    const far = resolveClearance(input({ from: at(90, 34), clearer: strong }), scripted(0.9));
    expect(far.ball.x).toBeLessThanOrEqual(105);
  });

  it("drifts towards the nearer touchline", () => {
    expect(resolveClearance(input({ from: at(20, 10) }), scripted(0.9)).ball.y).toBeLessThan(10);
    expect(resolveClearance(input({ from: at(20, 60) }), scripted(0.9)).ball.y).toBeGreaterThan(60);
  });

  it("goes out of play on a low draw with a throw-in for the opponent", () => {
    const r = resolveClearance(input({ from: at(20, 10) }), scripted(0.01));
    expect(r.outcome).toBe("outOfPlay");
    expect(r.restart).toMatchObject({ team: "away", variant: "throwIn" });
    expect(r.possession).toEqual({ side: "away" });
  });

  it("goes out more often under pressure and with a worse clearer", () => {
    expect(resolveClearance(input(), scripted(0.25)).outcome).toBe("kept");
    expect(resolveClearance(input({ pressure: 1 }), scripted(0.25)).outcome).toBe("outOfPlay");
    const poor = anEnginePlayer("k").withAttribute("ballControl", 1).build();
    expect(resolveClearance(input({ clearer: poor }), scripted(0.25)).outcome).toBe("outOfPlay");
  });

  it("clamps the out-of-play chance to named bounds", () => {
    const good = anEnginePlayer("k").withAttribute("ballControl", 20).build();
    expect(resolveClearance(input({ clearer: good }), scripted(0.049)).outcome).toBe("outOfPlay");
    expect(resolveClearance(input({ clearer: good }), scripted(0.051)).outcome).toBe("kept");
    const poor = anEnginePlayer("k").withAttribute("ballControl", 1).build();
    expect(resolveClearance(input({ clearer: poor, pressure: 1 }), scripted(0.499)).outcome).toBe(
      "outOfPlay",
    );
    expect(resolveClearance(input({ clearer: poor, pressure: 1 }), scripted(0.501)).outcome).toBe(
      "kept",
    );
  });

  it("mirrors the direction for the away side", () => {
    const r = resolveClearance(
      input({
        side: "away",
        from: at(85, 34),
        teammates: [challenger(8, at(60, 34))],
        opponents: [],
      }),
      scripted(0.9),
    );
    expect(r.ball.x).toBeCloseTo(55, 6);
    expect(r.possession).toEqual({ side: "away", slot: 8 });
  });

  it("gives the ball to the opponent's side with no slot when nobody is on the pitch to reach it", () => {
    expect(
      resolveClearance(input({ teammates: [], opponents: [] }), scripted(0.9)).possession,
    ).toEqual({
      side: "home",
    });
  });
});
