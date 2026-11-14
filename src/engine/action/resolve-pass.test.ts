import { describe, expect, it } from "vitest";
import { createRng } from "../rng";
import { anEnginePlayer } from "./action-builders";
import type { Challenger } from "./open-play-types";
import { interceptionChance } from "./resolve-interception";
import { type PassInput, passCompletionChance, resolvePass } from "./resolve-pass";

const scripted = (...values: number[]) => {
  let i = 0;
  return { ...createRng(1), next: () => values[i++] ?? 0.999 };
};
const at = (x: number, y = 34) => ({ x, y });
const passer = anEnginePlayer("p").build();
const receiver = anEnginePlayer("r").build();
const defender = (slot: number, point = at(60), tweak = 10): Challenger => ({
  slot,
  point,
  player: anEnginePlayer(`d${slot}`)
    .withAttribute("positioning", tweak)
    .withAttribute("workRate", tweak)
    .build(),
});
const input = (extra: Partial<PassInput> = {}): PassInput => ({
  side: "home",
  passer,
  receiverSlot: 7,
  receiver,
  variant: "short",
  from: at(50),
  to: at(60),
  pressure: 0,
  opponents: [],
  ...extra,
});

describe("resolvePass", () => {
  it("completes when the draw is below the completion chance and gives the ball to the receiver", () => {
    const r = resolvePass(input(), scripted(0.1));
    expect(r.outcome).toBe("complete");
    expect(r.ball).toEqual(at(60));
    expect(r.possession).toEqual({ side: "home", slot: 7 });
    expect(r.restart).toBeUndefined();
  });

  it("completes more often with a better passer, a better receiver and less pressure", () => {
    const draw = 0.9; // average short pass completes at 0.9 - hit the edge
    const base = resolvePass(input(), scripted(draw)).outcome;
    expect(base).not.toBe("complete");
    const better = anEnginePlayer("p")
      .withAttribute("passing", 20)
      .withAttribute("ballControl", 20)
      .build();
    expect(resolvePass(input({ passer: better }), scripted(draw)).outcome).toBe("complete");
    const worse = anEnginePlayer("p")
      .withAttribute("passing", 1)
      .withAttribute("ballControl", 1)
      .build();
    expect(resolvePass(input({ passer: worse }), scripted(0.8)).outcome).not.toBe("complete");
    expect(resolvePass(input({ pressure: 1 }), scripted(0.7)).outcome).not.toBe("complete");
    expect(resolvePass(input({ pressure: 0 }), scripted(0.7)).outcome).toBe("complete");
  });

  it("is harder for risky variants", () => {
    expect(resolvePass(input({ variant: "short" }), scripted(0.8)).outcome).toBe("complete");
    expect(resolvePass(input({ variant: "through" }), scripted(0.8)).outcome).not.toBe("complete");
  });

  it("clamps the completion chance to named bounds", () => {
    const perfect = anEnginePlayer("p")
      .withAttribute("passing", 20)
      .withAttribute("ballControl", 20)
      .build();
    expect(resolvePass(input({ passer: perfect }), scripted(0.98)).outcome).not.toBe("complete");
    const hopeless = anEnginePlayer("p")
      .withAttribute("passing", 1)
      .withAttribute("ballControl", 1)
      .build();
    expect(
      resolvePass(input({ passer: hopeless, variant: "cross", pressure: 1 }), scripted(0.14))
        .outcome,
    ).toBe("complete");
  });

  it("is intercepted by an opponent on the lane when the interception draw succeeds", () => {
    const r = resolvePass(input({ opponents: [defender(3, at(55, 35))] }), scripted(0.99, 0.1));
    expect(r.outcome).toBe("intercepted");
    expect(r.possession).toEqual({ side: "away", slot: 3 });
    expect(r.ball).toEqual(at(55, 35));
  });

  it("ignores opponents away from the lane", () => {
    const r = resolvePass(
      input({ opponents: [defender(3, at(55, 50))] }),
      scripted(0.99, 0.1, 0.99),
    );
    expect(r.outcome).not.toBe("intercepted");
  });

  it("ends incomplete with the nearest opponent on the ball when the interception and out-of-play draws miss", () => {
    const r = resolvePass(
      input({ opponents: [defender(3, at(62, 50)), defender(4, at(80, 34))] }),
      scripted(0.99, 0.99, 0.99),
    );
    expect(r.outcome).toBe("incomplete");
    expect(r.possession).toEqual({ side: "away", slot: 3 });
    expect(r.ball).toEqual(at(60));
  });

  it("goes out of play with a restart for the other side", () => {
    const r = resolvePass(
      input({ variant: "long", from: at(80, 60), to: at(90, 66) }),
      scripted(0.99, 0.01),
    );
    expect(r.outcome).toBe("outOfPlay");
    expect(r.restart?.team).toBe("away");
    expect(r.restart?.variant).toBe("throwIn");
    expect(r.possession).toEqual({ side: "away" });
    expect(r.ball).toEqual(r.restart?.position);
  });

  it("is deterministic for the same RNG state", () => {
    const a = resolvePass(input(), createRng(5));
    expect(resolvePass(input(), createRng(5))).toEqual(a);
  });
});

describe("resolvePass with tactics", () => {
  it("completes a pass that normal tempo loses when tempo is slow, and fast tempo lowers the chance", () => {
    const chance = passCompletionChance(input());
    const draw = chance + 0.01;
    expect(resolvePass(input(), scripted(draw)).outcome).not.toBe("complete");
    expect(resolvePass(input({ passSuccess: 0.03 }), scripted(draw)).outcome).toBe("complete");
    expect(passCompletionChance(input({ passSuccess: -0.03 }))).toBeLessThan(chance);
  });

  it("lets a pressing opponent read more passes: the interception bonus changes the outcome on the same draws", () => {
    const opp = [defender(9, at(55))];
    const chance = interceptionChance(opp[0] as Challenger, 0);
    const draws = [0.99, chance + 0.01, 0.99];
    expect(resolvePass(input({ opponents: opp }), scripted(...draws)).outcome).not.toBe(
      "intercepted",
    );
    expect(
      resolvePass(input({ opponents: opp, interceptBonus: 0.05 }), scripted(...draws)).outcome,
    ).toBe("intercepted");
  });
});
