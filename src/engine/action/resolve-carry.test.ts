import { describe, expect, it } from "vitest";
import { createRng } from "../rng";
import { anEnginePlayer } from "./action-builders";
import { type CarryInput, resolveCarry } from "./resolve-carry";

const scripted = (...values: number[]) => {
  let i = 0;
  return { ...createRng(1), next: () => values[i++] ?? 0.999 };
};
const at = (x: number, y = 34) => ({ x, y });
const carrier = anEnginePlayer("c").build();
const defender = { slot: 5, point: at(58), player: anEnginePlayer("d").build() };
const input = (extra: Partial<CarryInput> = {}): CarryInput => ({
  side: "home",
  carrier,
  carrierSlot: 6,
  from: at(50),
  to: at(58),
  pressure: 0,
  defender,
  ...extra,
});

describe("resolveCarry", () => {
  it("keeps the ball at the target when the draw succeeds", () => {
    expect(resolveCarry(input(), scripted(0.1))).toEqual({
      outcome: "kept",
      ball: at(58),
      possession: { side: "home", slot: 6 },
    });
  });

  it("is tackled by the nearest defender when the draw fails", () => {
    const r = resolveCarry(input(), scripted(0.99, 0.5));
    expect(r.outcome).toBe("tackled");
    expect(r.possession).toEqual({ side: "away", slot: 5 });
    expect(r.ball).toEqual(at(54));
  });

  it("succeeds more often with better dribbling and against a weaker tackler", () => {
    // Kept chance: 0.705 for the average carrier, 0.765 for the skilled one, 0.863 against the weak tackler.
    const draw = 0.73;
    expect(resolveCarry(input(), scripted(draw)).outcome).not.toBe("kept");
    const skilled = anEnginePlayer("c")
      .withAttribute("dribbling", 20)
      .withAttribute("pace", 20)
      .build();
    expect(resolveCarry(input({ carrier: skilled }), scripted(draw)).outcome).toBe("kept");
    const weak = {
      ...defender,
      player: anEnginePlayer("d").withAttribute("tackling", 1).withAttribute("pace", 1).build(),
    };
    expect(resolveCarry(input({ defender: weak }), scripted(draw)).outcome).toBe("kept");
  });

  it("succeeds less often under pressure", () => {
    expect(resolveCarry(input({ pressure: 0 }), scripted(0.7)).outcome).toBe("kept");
    expect(resolveCarry(input({ pressure: 1 }), scripted(0.7)).outcome).not.toBe("kept");
  });

  it("clamps the kept chance to named bounds", () => {
    const skilled = anEnginePlayer("c")
      .withAttribute("dribbling", 20)
      .withAttribute("pace", 20)
      .build();
    const weak = {
      ...defender,
      player: anEnginePlayer("d").withAttribute("tackling", 1).withAttribute("pace", 1).build(),
    };
    expect(
      resolveCarry(input({ carrier: skilled, defender: weak }), scripted(0.98)).outcome,
    ).not.toBe("kept");
    const poor = anEnginePlayer("c").withAttribute("dribbling", 1).withAttribute("pace", 1).build();
    const strong = {
      ...defender,
      player: anEnginePlayer("d").withAttribute("tackling", 20).withAttribute("pace", 20).build(),
    };
    expect(
      resolveCarry(input({ carrier: poor, defender: strong, pressure: 1 }), scripted(0.29)).outcome,
    ).toBe("kept");
  });

  it("goes out of play near a line with a restart for the other side", () => {
    const r = resolveCarry(
      input({ from: at(50, 66), to: at(58, 67), defender: undefined }),
      scripted(0.99, 0.5),
    );
    expect(r.outcome).toBe("outOfPlay");
    expect(r.restart).toMatchObject({ team: "away", variant: "throwIn" });
    expect(r.possession).toEqual({ side: "away" });
  });

  it("cannot fail without a defender away from the lines", () => {
    expect(resolveCarry(input({ defender: undefined }), scripted(0.999)).outcome).toBe("kept");
  });
});
