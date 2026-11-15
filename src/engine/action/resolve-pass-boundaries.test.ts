import { describe, expect, it } from "vitest";
import { createRng } from "../rng";
import { anEnginePlayer } from "./action-builders";
import {
  CROSS_DEFLECTED_CORNER_SHARE,
  CROSS_INTERCEPTED_CORNER_SHARE,
  LANE_RADIUS,
  PASS_OUT_SHARE,
  PASS_PRESSURE_PENALTY,
  PASS_RECEIVER_GAIN,
  PASS_SKILL_GAIN,
} from "./decision-constants";
import type { EngineAttributeName } from "./engine-player";
import type { Challenger } from "./open-play-types";
import { interceptionChance } from "./resolve-interception";
import { type PassInput, passCompletionChance, resolvePass } from "./resolve-pass";

const scripted = (...values: number[]) => {
  let i = 0;
  return { ...createRng(1), next: () => values[i++] ?? 0.999 };
};
const at = (x: number, y = 34) => ({ x, y });
const playerWith = (id: string, attributes: Partial<Record<EngineAttributeName, number>>) =>
  Object.entries(attributes)
    .reduce(
      (builder, [name, value]) => builder.withAttribute(name as EngineAttributeName, value),
      anEnginePlayer(id),
    )
    .build();
const defender = (slot: number, point: { x: number; y: number }, skill = 10): Challenger => ({
  slot,
  point,
  player: playerWith(`d${slot}`, { positioning: skill, workRate: skill }),
});
const input = (extra: Partial<PassInput> = {}): PassInput => ({
  side: "home",
  passer: anEnginePlayer("p").build(),
  receiverSlot: 7,
  receiver: anEnginePlayer("r").build(),
  variant: "through",
  from: at(50),
  to: at(60),
  pressure: 0,
  opponents: [],
  ...extra,
});

describe("passCompletionChance", () => {
  const base = passCompletionChance(input());

  it("weights the passer's passing at 0.6 and ball control at 0.4 of the skill term", () => {
    const passing = passCompletionChance(input({ passer: playerWith("p", { passing: 12 }) }));
    expect(passing - base).toBeCloseTo(PASS_SKILL_GAIN * 0.6 * (2 / 20), 9);
    const control = passCompletionChance(input({ passer: playerWith("p", { ballControl: 12 }) }));
    expect(control - base).toBeCloseTo(PASS_SKILL_GAIN * 0.4 * (2 / 20), 9);
  });

  it("adds the receiver's ball control, subtracts pressure and adds tempo and home advantage", () => {
    const receiver = passCompletionChance(
      input({ receiver: playerWith("r", { ballControl: 12 }) }),
    );
    expect(receiver - base).toBeCloseTo(PASS_RECEIVER_GAIN * (2 / 20), 9);
    expect(base - passCompletionChance(input({ pressure: 0.5 }))).toBeCloseTo(
      PASS_PRESSURE_PENALTY * 0.5,
      9,
    );
    expect(passCompletionChance(input({ passSuccess: 0.02 })) - base).toBeCloseTo(0.02, 9);
    expect(passCompletionChance(input({ advantage: 0.01 })) - base).toBeCloseTo(0.01, 9);
  });
});

describe("resolvePass boundaries", () => {
  it("completes just below the completion chance and not exactly at it", () => {
    const chance = passCompletionChance(input());
    expect(resolvePass(input(), scripted(chance - 1e-9)).outcome).toBe("complete");
    expect(resolvePass(input(), scripted(chance)).outcome).not.toBe("complete");
  });

  it("goes out of play below the out share of the variant and stays in play exactly at it", () => {
    const long = input({ variant: "long", from: at(80, 60), to: at(90, 66) });
    const share = PASS_OUT_SHARE.long;
    expect(resolvePass(long, scripted(0.999, share - 1e-9)).outcome).toBe("outOfPlay");
    expect(resolvePass(long, scripted(0.999, share)).outcome).toBe("incomplete");
  });

  it("counts an opponent exactly at the lane radius as on the lane, and one a hair further as off it", () => {
    const edge = input({ opponents: [defender(3, at(55, 34 + LANE_RADIUS))] });
    const outside = input({ opponents: [defender(3, at(55, 34 + LANE_RADIUS + 1e-6))] });
    expect(resolvePass(edge, scripted(0.999, 0.01)).outcome).toBe("intercepted");
    expect(resolvePass(outside, scripted(0.999, 0.01)).outcome).not.toBe("intercepted");
  });

  it("lets the best-placed lane opponent read the pass, whatever the order", () => {
    const weak = defender(3, at(54, 35), 4);
    const strong = defender(4, at(56, 33), 18);
    const mid = (interceptionChance(weak, 0, 0) + interceptionChance(strong, 0, 0)) / 2;
    for (const opponents of [
      [weak, strong],
      [strong, weak],
    ]) {
      const r = resolvePass(input({ opponents }), scripted(0.999, mid));
      expect(r.outcome).toBe("intercepted");
      expect(r.possession).toEqual({ side: "away", slot: 4 });
    }
  });

  it("keeps the first of two equally good lane opponents", () => {
    const first = defender(3, at(54, 35));
    const second = defender(4, at(56, 33));
    const draw = interceptionChance(first, 0, 0) - 1e-9;
    expect(
      resolvePass(input({ opponents: [first, second] }), scripted(0.999, draw)).possession,
    ).toEqual({
      side: "away",
      slot: 3,
    });
    expect(
      resolvePass(input({ opponents: [second, first] }), scripted(0.999, draw)).possession,
    ).toEqual({
      side: "away",
      slot: 4,
    });
  });

  it("gives an incomplete pass to the opponent nearest the target by true distance", () => {
    const near = defender(3, at(61, 34));
    const far = defender(4, at(40, 34));
    for (const opponents of [
      [near, far],
      [far, near],
    ]) {
      const r = resolvePass(input({ opponents }), scripted(0.999, 0.999, 0.999));
      expect(r.outcome).toBe("incomplete");
      expect(r.possession).toEqual({ side: "away", slot: 3 });
    }
  });

  it("gives an incomplete pass to the first of two opponents equally near the target", () => {
    const a = defender(3, at(60, 50));
    const b = defender(4, at(60, 18));
    expect(resolvePass(input({ opponents: [a, b] }), scripted(0.999)).possession).toEqual({
      side: "away",
      slot: 3,
    });
    expect(resolvePass(input({ opponents: [b, a] }), scripted(0.999)).possession).toEqual({
      side: "away",
      slot: 4,
    });
  });

  it("gives the ball to the home side when an away pass is lost", () => {
    const r = resolvePass(
      input({ side: "away", from: at(50), to: at(40), opponents: [defender(3, at(40, 40))] }),
      scripted(0.999),
    );
    expect(r.outcome).toBe("incomplete");
    expect(r.possession).toEqual({ side: "home", slot: 3 });
    const nobody = resolvePass(input({ side: "away", from: at(50), to: at(40) }), scripted(0.999));
    expect(nobody.possession).toEqual({ side: "home" });
  });
});

describe("resolvePass crosses behind the goal line", () => {
  const cross = input({ variant: "cross", from: at(90, 10), to: at(104, 20) });

  it("keeps a goal kick when the deflection draw is exactly at the share", () => {
    const r = resolvePass(cross, scripted(0.999, 0.01, CROSS_DEFLECTED_CORNER_SHARE));
    expect(r.restart?.variant).toBe("goalKick");
  });

  it("puts a deflected cross out for a corner for the crossing side at the end of the attacked goal", () => {
    const home = resolvePass(cross, scripted(0.999, 0.01, CROSS_DEFLECTED_CORNER_SHARE - 1e-9));
    expect(home.restart).toEqual({ team: "home", variant: "corner", position: at(105, 0) });
    const awayCross = input({ side: "away", variant: "cross", from: at(15, 58), to: at(1, 50) });
    const away = resolvePass(awayCross, scripted(0.999, 0.01, 0));
    expect(away.restart).toEqual({ team: "away", variant: "corner", position: at(0, 68) });
  });

  describe("when a defender reads the cross", () => {
    const from = at(90, 10);
    const intercepted = (extra: Partial<PassInput>) => {
      const to = extra.to ?? at(100, 12);
      const reader = defender(3, at((from.x + to.x) / 2, (from.y + to.y) / 2), 20);
      return input({ variant: "cross", from, to, opponents: [reader], ...extra });
    };

    it("keeps play going exactly at the corner share", () => {
      const r = resolvePass(intercepted({}), scripted(0.999, 0.01, CROSS_INTERCEPTED_CORNER_SHARE));
      expect(r.outcome).toBe("intercepted");
      expect(r.restart).toBeUndefined();
    });

    it("gives the corner on the side of the target, the lower half at the line y 0 and the upper half at 68", () => {
      const low = resolvePass(intercepted({ to: at(100, 33.99) }), scripted(0.999, 0.01, 0));
      expect(low.restart?.position).toEqual(at(105, 0));
      const middle = resolvePass(intercepted({ to: at(100, 34) }), scripted(0.999, 0.01, 0));
      expect(middle.restart?.position).toEqual(at(105, 68));
    });

    it("gives the away side its corner at its own attacked end", () => {
      const awayReader = defender(3, at(10, 57), 20);
      const r = resolvePass(
        input({
          side: "away",
          variant: "cross",
          from: at(15, 58),
          to: at(5, 56),
          opponents: [awayReader],
        }),
        scripted(0.999, 0.01, 0),
      );
      expect(r.outcome).toBe("intercepted");
      expect(r.restart).toEqual({ team: "away", variant: "corner", position: at(0, 68) });
      expect(r.possession).toEqual({ side: "away" });
    });

    it("does not draw for a corner on any other variant", () => {
      const r = resolvePass(intercepted({ variant: "long" }), scripted(0.999, 0.01, 0));
      expect(r.outcome).toBe("intercepted");
      expect(r.restart).toBeUndefined();
    });
  });
});
