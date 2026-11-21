import { describe, expect, it } from "vitest";
import { PENALTY_XG } from "../action/decision-constants";
import type { Point } from "../action/pitch-metres";
import type { Rng } from "../rng";
import type { Chance } from "./chance";
import { MAX_CHANCE_XG } from "./chance-constants";
import { chanceXg, drawChance, drawKind, drawSituation } from "./draw-chance";
import type { PhaseStart } from "./phase-step";

/** An Rng that returns `values` from `next` in order and 0.5 afterwards, counting the draws. */
const scripted = (...values: number[]): Rng & { draws: () => number } => {
  let index = 0;
  const next = (): number => values[index++] ?? 0.5;
  const rng: Rng & { draws: () => number } = {
    next,
    int: (min, max) => min + Math.floor(next() * (max - min + 1)),
    pick: (list) => list[Math.floor(next() * list.length)] as never,
    chance: (p) => next() < p,
    fork: () => rng,
    draws: () => index,
  };
  return rng;
};

const link = (player: string, x: number, y: number) => ({ player, at: { x, y } });
const keeper = "a-1";
const input = (
  chain: ReturnType<typeof link>[],
  start: PhaseStart = "tackle",
  team: "home" | "away" = "home",
  ball: Point = { x: 70, y: 34 },
) => ({ team, start, ball, chain, keeper });

const central = [link("h-5", 40, 34), link("h-8", 62, 34), link("h-10", 90, 34)];
const wideAt = (depth: number) => [
  link("h-5", 40, 34),
  link("h-7", depth, 6),
  link("h-10", Math.min(depth + 5, 104), 34),
];

describe("drawKind", () => {
  it.each([
    ["penalty", "penalty"],
    ["corner", "setPiece"],
  ] as const)("is fixed by a %s start", (start, kind) => {
    expect(drawKind(input(central, start), scripted())).toBe(kind);
  });

  it("makes a free kick taken by one player a free-kick chance and a played one a set piece", () => {
    expect(drawKind(input([link("h-10", 88, 30)], "freeKick"), scripted())).toBe("freeKick");
    expect(drawKind(input(central, "freeKick"), scripted())).toBe("setPiece");
  });

  it("is open play when no geometry allows another kind", () => {
    const quiet = [link("h-5", 40, 34), link("h-8", 80, 34), link("h-10", 86, 34)];

    expect(drawKind(input(quiet), scripted(0.99))).toBe("openPlay");
  });

  it("lets a wide creator in the final third cross, and a deep one cut the ball back", () => {
    expect(drawKind(input(wideAt(75)), scripted(0.1))).toBe("openPlay");
    expect(drawKind(input(wideAt(75)), scripted(0.99))).toBe("cross");
    expect(drawKind(input(wideAt(96)), scripted(0.99))).toBe("cutBack");
  });

  it("calls a last pass that gains ground a through ball", () => {
    const through = [link("h-5", 40, 34), link("h-8", 60, 34), link("h-10", 88, 34)];

    expect(drawKind(input(through), scripted(0.99))).toBe("throughBall");
  });

  it("calls a quick attack from a won ball in the own half a counter", () => {
    const won = input(central, "interception", "home", { x: 40, y: 34 });

    expect(drawKind(won, scripted(0.99))).toBe("counter");
    expect(drawKind({ ...won, ball: { x: 70, y: 34 } }, scripted(0.99))).not.toBe("counter");
    expect(drawKind({ ...won, start: "goalKick" }, scripted(0.99))).not.toBe("counter");
  });

  it("reads the geometry in the attacker's frame for the away side", () => {
    const away = [link("a-5", 65, 34), link("a-7", 30, 62), link("a-10", 25, 34)];

    expect(drawKind(input(away, "throwIn", "away", { x: 70, y: 34 }), scripted(0.99))).toBe(
      "cross",
    );
  });
});

describe("drawSituation", () => {
  it.each([
    ["throughBall", 0.1, "oneOnOne"],
    ["throughBall", 0.9, "box"],
    ["cross", 0.3, "header"],
    ["cross", 0.8, "volley"],
    ["setPiece", 0.3, "header"],
    ["cutBack", 0.98, "box"],
  ] as const)("draws a %s with %s as %s", (kind, draw, situation) => {
    expect(drawSituation(kind, 10, scripted(draw))).toBe(situation);
  });

  it("turns a box shot from far out into a shot from the edge", () => {
    expect(drawSituation("openPlay", 19, scripted(0.5))).toBe("edge");
    expect(drawSituation("openPlay", 12, scripted(0.5))).toBe("box");
  });

  it("makes a penalty a one-on-one and a direct free kick a shot from the edge, without a draw", () => {
    const rng = scripted();

    expect(drawSituation("penalty", 11, rng)).toBe("oneOnOne");
    expect(drawSituation("freeKick", 20, rng)).toBe("edge");
    expect(rng.draws()).toBe(0);
  });
});

describe("chanceXg", () => {
  const from = { x: 92, y: 34 };

  it("gives a penalty the penalty xG", () => {
    expect(chanceXg("penalty", "oneOnOne", "home", from)).toBe(PENALTY_XG);
  });

  it("rates a one-on-one and a cut-back higher than a pressed box shot from the same spot", () => {
    const box = chanceXg("openPlay", "box", "home", from);

    expect(chanceXg("throughBall", "oneOnOne", "home", from)).toBeGreaterThan(box * 2);
    expect(chanceXg("cutBack", "box", "home", from)).toBeGreaterThan(box);
  });

  it("rates a header and a volley below a foot shot from the same spot", () => {
    const box = chanceXg("cross", "box", "home", from);

    expect(chanceXg("cross", "header", "home", from)).toBeLessThan(box);
    expect(chanceXg("cross", "volley", "home", from)).toBeLessThan(box);
  });

  it("rates a direct free kick low and never above the cap", () => {
    expect(chanceXg("freeKick", "edge", "home", { x: 86, y: 34 })).toBeLessThan(0.1);
    expect(chanceXg("throughBall", "oneOnOne", "home", { x: 100, y: 34 })).toBeLessThanOrEqual(
      MAX_CHANCE_XG,
    );
  });

  it("is the same for both sides at mirrored points", () => {
    expect(chanceXg("cross", "box", "away", { x: 13, y: 40 })).toBeCloseTo(
      chanceXg("cross", "box", "home", { x: 92, y: 40 }),
    );
  });

  it("falls with the distance from goal", () => {
    expect(chanceXg("openPlay", "box", "home", { x: 100, y: 34 })).toBeGreaterThan(
      chanceXg("openPlay", "box", "home", { x: 85, y: 34 }),
    );
  });
});

describe("drawChance", () => {
  it("names the last passer as creator and the last player as shooter, facing the keeper", () => {
    const chance = drawChance(input(central), scripted(0.99, 0.9));

    expect(chance).toMatchObject({
      creator: "h-8",
      shooter: "h-10",
      keeper,
      kind: "throughBall",
      situation: "box",
      from: { x: 90, y: 34 },
    });
    expect(chance.xg).toBeGreaterThan(0);
  });

  it("takes a corner's delivery as the creator and keeps a lone taker as his own creator", () => {
    const corner = drawChance(
      input([link("h-7", 105, 0), link("h-9", 94, 34)], "corner"),
      scripted(0.3),
    );
    const penalty = drawChance(input([link("h-9", 94, 34)], "penalty"), scripted());

    expect(corner).toMatchObject({ kind: "setPiece", situation: "header", creator: "h-7" });
    expect(penalty).toMatchObject({ creator: "h-9", shooter: "h-9", xg: PENALTY_XG });
  });

  it("copies the shot position instead of sharing it with the chain", () => {
    const chain = [...central];
    const chance = drawChance(input(chain), scripted());

    expect(chance.from).toEqual(chain[2]?.at);
    expect(chance.from).not.toBe(chain[2]?.at);
  });

  it("draws nothing for a penalty and at most two values otherwise", () => {
    const penalty = scripted();
    const open = scripted();
    drawChance(input([link("h-9", 94, 34)], "penalty"), penalty);
    drawChance(input(central), open);

    expect(penalty.draws()).toBe(0);
    expect(open.draws()).toBe(2);
  });

  it("returns a chance without a result", () => {
    const chance: Omit<Chance, "result" | "aftermath"> = drawChance(input(central), scripted());

    expect(chance).not.toHaveProperty("result");
  });
});
