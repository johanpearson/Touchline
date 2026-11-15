import { describe, expect, it } from "vitest";
import { NEUTRAL_TACTICS, type TeamTactics } from "../tactics";
import { anEnginePlayer } from "./action-builders";
import type { PassVariant } from "./action-event";
import { type ActorContext, buildOptions } from "./build-options";
import {
  CLEARANCE_DANGER_DEPTH,
  CLEARANCE_SAFE_FACTOR,
  CROSS_MIN_DEPTH,
  CROSS_WIDE_CHANNEL,
  GOALKEEPER_CARRY_FACTOR,
  LONG_PASS_MIN,
  SHORT_PASS_MAX,
  THROUGH_PASS_MIN_DISTANCE,
  THROUGH_PASS_MIN_PROGRESS,
} from "./decision-constants";
import type { EngineAttributeName, EnginePlayer } from "./engine-player";
import { PITCH_LENGTH, PITCH_WIDTH, type Point } from "./pitch-metres";
import { pressureOn, type Shapes } from "./pressure";
import { actionTactics } from "./tactics-parameters";

const at = (x: number, y: number): Point => ({ x, y });
const FAR: Point[] = [at(100, 2), at(100, 66)];
const tactics = (t: Partial<TeamTactics> = {}): TeamTactics => ({ ...NEUTRAL_TACTICS, ...t });
const player = (id: string, attributes: Partial<Record<EngineAttributeName, number>> = {}) =>
  Object.entries(attributes)
    .reduce(
      (builder, [name, value]) => builder.withAttribute(name as EngineAttributeName, value),
      anEnginePlayer(id),
    )
    .build();

/** A two-player side: the actor on `from` and one teammate on `to`; the opponents stand far away. */
const duel = (
  side: "home" | "away",
  from: Point,
  to: Point,
  attributes: Partial<Record<EngineAttributeName, number>> = {},
  t: Partial<TeamTactics> = {},
) => {
  const own = [from, to];
  const shapes: Shapes = side === "home" ? { home: own, away: FAR } : { home: FAR, away: own };
  const players: EnginePlayer[] = [player("a", attributes), player("b")];
  const ctx: ActorContext = { side, slot: 0, players };
  return buildOptions(ctx, shapes, tactics(t));
};
const passTo = (options: ReturnType<typeof buildOptions>) => {
  const pass = options.find((o) => o.type === "pass");
  if (pass?.type !== "pass") throw new Error("no pass option");
  return pass;
};
const variantOf = (side: "home" | "away", from: Point, to: Point): PassVariant =>
  passTo(duel(side, from, to)).variant;

describe("pass variant geometry", () => {
  const from = at(40, 34);

  it("calls a pass of exactly the long-pass minimum long, and a hair less a through ball", () => {
    expect(variantOf("home", from, at(40 + LONG_PASS_MIN, 34))).toBe("long");
    expect(variantOf("home", from, at(40 + LONG_PASS_MIN - 0.01, 34))).toBe("through");
  });

  it("calls a forward pass of exactly the through minimums a through ball", () => {
    const edge = THROUGH_PASS_MIN_PROGRESS;
    expect(THROUGH_PASS_MIN_DISTANCE).toBeLessThanOrEqual(edge);
    expect(variantOf("home", from, at(40 + edge, 34))).toBe("through");
    expect(variantOf("home", from, at(40 + edge - 0.01, 34))).toBe("short");
  });

  it("needs both the progress and the distance for a through ball", () => {
    const sideways = at(40 + THROUGH_PASS_MIN_PROGRESS - 5, 34 + THROUGH_PASS_MIN_DISTANCE);
    expect(variantOf("home", from, sideways)).toBe("short");
    const backwards = at(40 - THROUGH_PASS_MIN_PROGRESS, 34);
    expect(variantOf("home", from, backwards)).toBe("short");
  });

  it("calls a pass of exactly the short-pass maximum short and a hair more long", () => {
    expect(variantOf("home", from, at(40, 34 + SHORT_PASS_MAX))).toBe("short");
    expect(variantOf("home", from, at(40, 34 - SHORT_PASS_MAX - 0.01))).toBe("long");
  });

  it("calls a pass into a wide channel deep in the attacking half a cross", () => {
    const deep = CROSS_MIN_DEPTH;
    const edge = CROSS_WIDE_CHANNEL;
    expect(variantOf("home", at(60, 34), at(deep, edge - 0.01))).toBe("cross");
    expect(variantOf("home", at(60, 34), at(deep, PITCH_WIDTH - edge + 0.01))).toBe("cross");
  });

  it("does not call a pass on the channel line, or shallower than the minimum depth, a cross", () => {
    const deep = CROSS_MIN_DEPTH;
    const edge = CROSS_WIDE_CHANNEL;
    expect(variantOf("home", at(60, 34), at(deep, edge))).toBe("long");
    expect(variantOf("home", at(60, 34), at(deep, PITCH_WIDTH - edge))).toBe("long");
    expect(variantOf("home", at(60, 34), at(deep - 0.01, edge - 0.01))).toBe("long");
  });

  it("measures depth from the own goal for the away side", () => {
    const away = PITCH_LENGTH - CROSS_MIN_DEPTH;
    expect(variantOf("away", at(45, 34), at(away, PITCH_WIDTH - CROSS_WIDE_CHANNEL + 0.01))).toBe(
      "cross",
    );
    expect(
      variantOf("away", at(45, 34), at(away + 0.01, PITCH_WIDTH - CROSS_WIDE_CHANNEL + 0.01)),
    ).toBe("long");
  });

  it("calls a forward pass of the away side through, so progress follows its attack direction", () => {
    const forward = at(60 - THROUGH_PASS_MIN_PROGRESS, 34);
    expect(variantOf("away", at(60, 34), forward)).toBe("through");
    expect(variantOf("away", at(60, 34), at(60 + THROUGH_PASS_MIN_PROGRESS, 34))).toBe("short");
  });
});

describe("pass weight composition", () => {
  const from = at(50, 34);
  const shortTo = at(60, 34);
  const longTo = at(50 + LONG_PASS_MIN, 34);

  it("scales a short pass with passing only: skill runs from 0.5 + 0.5 x rating", () => {
    const strong = passTo(duel("home", from, shortTo, { passing: 20 })).weight;
    const weak = passTo(duel("home", from, shortTo, { passing: 1 })).weight;
    expect(strong / weak).toBeCloseTo(1 / (0.5 + 0.5 / 20), 9);
  });

  it("ignores vision for a short pass", () => {
    const seer = passTo(duel("home", from, shortTo, { vision: 20 })).weight;
    const blind = passTo(duel("home", from, shortTo, { vision: 1 })).weight;
    expect(seer).toBe(blind);
  });

  it("adds 0.3 x vision rating to the skill of a pass that is not short", () => {
    const seer = passTo(duel("home", from, longTo, { passing: 10, vision: 20 })).weight;
    const blind = passTo(duel("home", from, longTo, { passing: 10, vision: 1 })).weight;
    expect(seer / blind).toBeCloseTo((0.75 + 0.3) / (0.75 + 0.3 / 20), 9);
  });

  it("gives a long pass a smaller weight than a short pass of the same direction and skill", () => {
    const short = passTo(duel("home", from, shortTo)).weight;
    const long = passTo(duel("home", from, longTo)).weight;
    expect(long).toBeGreaterThan(0);
    expect(long).toBeLessThan(short);
  });

  it("makes a through ball more attractive than the same distance sideways", () => {
    const through = passTo(duel("home", from, at(65, 34))).weight;
    const sideways = passTo(duel("home", from, at(50, 49))).weight;
    expect(through).toBeGreaterThan(sideways);
  });

  it("weighs a pass straight back lower than a pass straight forward of the same length", () => {
    const forward = passTo(duel("home", from, at(60, 34))).weight;
    const back = passTo(duel("home", from, at(40, 34))).weight;
    expect(back).toBeLessThan(forward);
    expect(back).toBeGreaterThan(0);
  });

  it("weighs a sideways pass between a forward and a backward pass of the same length", () => {
    const forward = passTo(duel("home", from, at(60, 34))).weight;
    const side = passTo(duel("home", from, at(50, 44))).weight;
    const back = passTo(duel("home", from, at(40, 34))).weight;
    expect(side).toBeLessThan(forward);
    expect(side).toBeGreaterThan(back);
  });

  it("applies a wide bonus to a pass to a wide target even when it is not a cross", () => {
    const wideTactics = { width: "wide" } as const;
    const wideTarget = at(50, 8);
    const centreTarget = at(50, 22);
    const plain = (to: Point) => passTo(duel("home", at(50, 34), to)).weight;
    const wide = (to: Point) => passTo(duel("home", at(50, 34), to, {}, wideTactics)).weight;
    expect(wide(wideTarget) / plain(wideTarget)).toBeGreaterThan(1);
    expect(wide(centreTarget) / plain(centreTarget)).toBe(1);
  });

  it("lowers a risky pass under pressure on the actor, but not a safe short pass", () => {
    const radius = actionTactics(NEUTRAL_TACTICS).pressRadius;
    const free = FAR;
    const pressed: Point[] = [at(50 - 2, 34), at(100, 66)];
    const run = (type: "short" | "long", away: Point[]) => {
      const to = type === "short" ? shortTo : longTo;
      const own = [from, to];
      const ctx: ActorContext = { side: "home", slot: 0, players: [player("a"), player("b")] };
      return passTo(buildOptions(ctx, { home: own, away }, tactics())).weight;
    };
    const shapes: Shapes = { home: [from, longTo], away: pressed };
    expect(pressureOn(from, "home", shapes, radius)).toBeGreaterThan(0);
    expect(pressureOn(longTo, "home", shapes, radius)).toBe(0);
    expect(run("long", pressed)).toBeLessThan(run("long", free));
    const shortShapes: Shapes = { home: [from, shortTo], away: pressed };
    expect(pressureOn(shortTo, "home", shortShapes, radius)).toBe(0);
    expect(run("short", pressed)).toBe(run("short", free));
  });

  it("gives through balls the counter bonus of a side that has just won the ball, others not", () => {
    const foeTactics = tactics({ pressing: "high" });
    const throughTo = at(65, 34);
    const build = (to: Point, transition: boolean) => {
      const ctx: ActorContext = {
        side: "home",
        slot: 0,
        players: [player("a"), player("b")],
        foeTactics,
        transition,
      };
      return passTo(buildOptions(ctx, { home: [from, to], away: FAR }, tactics())).weight;
    };
    expect(build(throughTo, true)).toBeGreaterThan(build(throughTo, false));
    expect(build(shortTo, true)).toBe(build(shortTo, false));
  });
});

describe("carry and clearance weights", () => {
  const carryOf = (options: ReturnType<typeof buildOptions>) => {
    const carry = options.find((o) => o.type === "carry");
    if (carry?.type !== "carry") throw new Error("no carry option");
    return carry;
  };
  const clearanceOf = (options: ReturnType<typeof buildOptions>) => {
    const clearance = options.find((o) => o.type === "clearance");
    if (clearance?.type !== "clearance") throw new Error("no clearance option");
    return clearance;
  };
  const from = at(50, 34);

  it("scales a carry with dribbling: 0.4 + 0.6 x rating", () => {
    const strong = carryOf(duel("home", from, at(60, 34), { dribbling: 20 })).weight;
    const weak = carryOf(duel("home", from, at(60, 34), { dribbling: 1 })).weight;
    expect(strong / weak).toBeCloseTo(1 / (0.4 + 0.6 / 20), 9);
  });

  it("lets a goalkeeper carry the ball far less often than an outfield player", () => {
    const own = [from, at(60, 34)];
    const shapes: Shapes = { home: own, away: FAR };
    const keeper = { ...player("a"), position: "GK" as const };
    const weight = (actor: EnginePlayer) =>
      carryOf(
        buildOptions({ side: "home", slot: 0, players: [actor, player("b")] }, shapes, tactics()),
      ).weight;
    expect(weight(keeper) / weight(player("a"))).toBeCloseTo(GOALKEEPER_CARRY_FACTOR, 9);
  });

  it("lowers the carry weight under pressure on the actor", () => {
    const radius = actionTactics(NEUTRAL_TACTICS).pressRadius;
    const behind: Shapes = { home: [from, at(60, 34)], away: [at(48, 34), at(100, 66)] };
    const carryTo = carryOf(
      buildOptions(
        { side: "home", slot: 0, players: [player("a"), player("b")] },
        behind,
        tactics(),
      ),
    ).to;
    expect(pressureOn(from, "home", behind, radius)).toBeGreaterThan(0);
    expect(pressureOn(carryTo, "home", behind, radius)).toBe(0);
    const freeShapes: Shapes = { home: behind.home, away: FAR };
    const weight = (s: Shapes) =>
      carryOf(
        buildOptions({ side: "home", slot: 0, players: [player("a"), player("b")] }, s, tactics()),
      ).weight;
    expect(weight(behind)).toBeLessThan(weight(freeShapes));
  });

  it("lowers the carry weight when the space ahead is pressed", () => {
    const radius = actionTactics(NEUTRAL_TACTICS).pressRadius;
    const ahead: Shapes = { home: [from, at(60, 34)], away: [at(59, 34), at(100, 66)] };
    const ctx: ActorContext = { side: "home", slot: 0, players: [player("a"), player("b")] };
    const carryTo = carryOf(buildOptions(ctx, ahead, tactics())).to;
    expect(pressureOn(from, "home", ahead, radius)).toBe(0);
    expect(pressureOn(carryTo, "home", ahead, radius)).toBeGreaterThan(0);
    const freeShapes: Shapes = { home: ahead.home, away: FAR };
    expect(carryOf(buildOptions(ctx, ahead, tactics())).weight).toBeLessThan(
      carryOf(buildOptions(ctx, freeShapes, tactics())).weight,
    );
  });

  it("raises the carry weight with a direct tempo", () => {
    const base = carryOf(duel("home", from, at(60, 34))).weight;
    expect(carryOf(duel("home", from, at(60, 34), {}, { tempo: "fast" })).weight).toBeGreaterThan(
      base,
    );
    expect(carryOf(duel("home", from, at(60, 34), {}, { tempo: "slow" })).weight).toBeLessThan(
      base,
    );
  });

  it("carries towards the attacked goal for both sides and stays on the pitch", () => {
    expect(carryOf(duel("home", from, at(60, 34))).to.x).toBeGreaterThan(from.x);
    expect(carryOf(duel("away", from, at(40, 34))).to.x).toBeLessThan(from.x);
    expect(carryOf(duel("home", at(PITCH_LENGTH - 1, 34), at(60, 34))).to.x).toBe(PITCH_LENGTH);
    expect(carryOf(duel("away", at(1, 34), at(60, 34))).to.x).toBe(0);
  });

  it("keeps a clearance light outside the danger zone and heavy inside it under the same pressure", () => {
    const crowd = (p: Point): Shapes => ({
      home: [p, at(80, 10)],
      away: [at(p.x + 1, p.y), at(p.x, p.y + 1)],
    });
    const weight = (p: Point) =>
      clearanceOf(
        buildOptions(
          { side: "home", slot: 0, players: [player("a"), player("b")] },
          crowd(p),
          tactics(),
        ),
      ).weight;
    const inside = weight(at(CLEARANCE_DANGER_DEPTH - 0.01, 34));
    const onLine = weight(at(CLEARANCE_DANGER_DEPTH, 34));
    expect(inside / onLine).toBeCloseTo(1 / CLEARANCE_SAFE_FACTOR, 9);
  });

  it("measures the clearance danger zone from the own goal for the away side", () => {
    const weight = (depth: number) => {
      const x = PITCH_LENGTH - depth;
      const shapes: Shapes = { home: [at(x - 1, 34), at(x, 35)], away: [at(x, 34), at(30, 10)] };
      const ctx: ActorContext = { side: "away", slot: 0, players: [player("a"), player("b")] };
      return clearanceOf(buildOptions(ctx, shapes, tactics())).weight;
    };
    expect(weight(CLEARANCE_DANGER_DEPTH - 0.01) / weight(CLEARANCE_DANGER_DEPTH)).toBeCloseTo(
      1 / CLEARANCE_SAFE_FACTOR,
      9,
    );
  });
});
