import { describe, expect, it } from "vitest";
import { NEUTRAL_TACTICS, type TeamTactics } from "../tactics";
import { anEnginePlayer } from "./action-builders";
import { type ActorContext, buildOptions } from "./build-options";
import type { Point } from "./pitch-metres";
import type { Shapes } from "./pressure";

const at = (x: number, y: number): Point => ({ x, y });
const home = [
  at(5, 34),
  at(30, 20),
  at(30, 48),
  at(50, 34),
  at(70, 10),
  at(75, 34),
  at(110 - 30, 60),
];
const players = (n: number) => Array.from({ length: n }, (_, i) => anEnginePlayer(`h${i}`).build());
const farAway: Point[] = [at(100, 2), at(100, 66)];
const shapes: Shapes = { home, away: farAway };
const actor = (slot = 3): ActorContext => ({ side: "home", slot, players: players(home.length) });
const tactics = (t: Partial<TeamTactics> = {}): TeamTactics => ({ ...NEUTRAL_TACTICS, ...t });

const passes = (options: ReturnType<typeof buildOptions>) =>
  options.flatMap((o) => (o.type === "pass" ? [o] : []));

describe("buildOptions", () => {
  it("offers a pass to every teammate except the actor, a carry and a clearance", () => {
    const options = buildOptions(actor(), shapes, tactics());
    expect(passes(options).map((p) => p.target)).toEqual([0, 1, 2, 4, 5, 6]);
    expect(options.filter((o) => o.type === "carry")).toHaveLength(1);
    expect(options.filter((o) => o.type === "clearance")).toHaveLength(1);
  });

  it("gives non-negative, finite weights", () => {
    for (const o of buildOptions(
      actor(),
      shapes,
      tactics({ tempo: "fast", mentality: "attacking" }),
    )) {
      expect(o.weight).toBeGreaterThanOrEqual(0);
      expect(Number.isFinite(o.weight)).toBe(true);
    }
  });

  it("picks the pass variant from distance and direction", () => {
    const byTarget = Object.fromEntries(
      passes(buildOptions(actor(), shapes, tactics())).map((p) => [p.target, p.variant]),
    );
    expect(byTarget).toMatchObject({ 0: "long", 1: "long", 4: "cross", 5: "through" });
    const near = passes(
      buildOptions(
        { ...actor(), players: players(home.length + 1) },
        { home: [...home, at(55, 40)], away: farAway },
        tactics(),
      ),
    ).find((p) => p.target === home.length);
    expect(near?.variant).toBe("short");
  });

  it("weights a closer, more advanced and less pressed target higher", () => {
    const options = passes(buildOptions(actor(), shapes, tactics()));
    const weight = (slot: number) => options.find((p) => p.target === slot)?.weight ?? 0;
    expect(weight(5)).toBeGreaterThan(weight(0)); // forward beats a pass back to the keeper
    const pressed: Shapes = { home, away: [at(75, 35), at(76, 33), at(74, 34)] };
    const pressedWeight = passes(buildOptions(actor(), pressed, tactics())).find(
      (p) => p.target === 5,
    )?.weight;
    expect(pressedWeight).toBeLessThan(weight(5));
  });

  it("raises pass weights with the actor's passing", () => {
    const skilled = { ...actor(), players: players(home.length) };
    skilled.players = skilled.players.map((p, i) =>
      i === 3 ? anEnginePlayer("h3").withAttribute("passing", 20).build() : p,
    );
    const base = passes(buildOptions(actor(), shapes, tactics()))[0]?.weight ?? 0;
    expect(passes(buildOptions(skilled, shapes, tactics()))[0]?.weight ?? 0).toBeGreaterThan(base);
  });

  it("prefers forward passes with fast tempo and an attacking mentality", () => {
    const forward = (t: TeamTactics) =>
      passes(buildOptions(actor(), shapes, t)).find((p) => p.target === 5)?.weight ?? 0;
    expect(forward(tactics({ tempo: "fast" }))).toBeGreaterThan(forward(tactics()));
    expect(forward(tactics({ mentality: "attacking" }))).toBeGreaterThan(forward(tactics()));
    expect(forward(tactics({ tempo: "slow" }))).toBeLessThan(forward(tactics()));
  });

  it("makes wide targets more attractive with wide width", () => {
    const wide = (t: TeamTactics) =>
      passes(buildOptions(actor(), shapes, t)).find((p) => p.target === 4)?.weight ?? 0;
    expect(wide(tactics({ width: "wide" }))).toBeGreaterThan(wide(tactics()));
    expect(wide(tactics({ width: "narrow" }))).toBeLessThan(wide(tactics()));
  });

  it("makes a clearance attractive only under pressure in the own third", () => {
    const clearance = (s: Shapes, slot: number) =>
      buildOptions(actor(slot), s, tactics()).find((o) => o.type === "clearance")?.weight ?? 0;
    const crowd: Shapes = { home, away: [at(31, 21), at(29, 19), at(30, 22)] };
    expect(clearance(crowd, 1)).toBeGreaterThan(clearance(shapes, 1));
    expect(clearance(crowd, 1)).toBeGreaterThan(
      clearance({ home, away: [at(71, 11), at(69, 9)] }, 4),
    );
  });

  it("mirrors direction for the away side", () => {
    const awayShape: Shapes = { home: farAway, away: [at(100, 34), at(70, 34), at(40, 34)] };
    const ctx: ActorContext = { side: "away", slot: 1, players: players(3) };
    const options = passes(buildOptions(ctx, awayShape, tactics()));
    const weight = (slot: number) => options.find((p) => p.target === slot)?.weight ?? 0;
    expect(weight(2)).toBeGreaterThan(weight(0));
    const carry = buildOptions(ctx, awayShape, tactics()).find((o) => o.type === "carry");
    expect(carry?.type === "carry" && carry.to.x).toBeLessThan(70);
  });
});

describe("buildOptions shot option", () => {
  const shotOf = (options: ReturnType<typeof buildOptions>) =>
    options.flatMap((o) => (o.type === "shot" ? [o] : []));
  const near: Shapes = { home: [at(5, 34), at(94, 34), at(80, 30)], away: farAway };
  const nearActor = (slot = 1): ActorContext => ({
    side: "home",
    slot,
    players: players(near.home.length),
  });

  it("offers one shot aimed at the goal centre with its xG", () => {
    const [shot] = shotOf(buildOptions(nearActor(), near, tactics()));
    expect(shotOf(buildOptions(nearActor(), near, tactics()))).toHaveLength(1);
    expect(shot?.from).toEqual(at(94, 34));
    expect(shot?.to).toEqual(at(105, 34));
    expect(shot?.xg).toBeCloseTo(0.07834, 4);
    expect(shot?.weight).toBeGreaterThan(0);
  });

  it("aims at the away goal for the away side, using the mirrored xG", () => {
    const away: Shapes = { home: farAway, away: [at(5, 34), at(11, 34)] };
    const [shot] = shotOf(
      buildOptions({ side: "away", slot: 1, players: players(2) }, away, tactics()),
    );
    expect(shot?.to).toEqual(at(0, 34));
    expect(shot?.xg).toBeCloseTo(0.07834, 4);
  });

  it("gives practically no weight to shots from far away", () => {
    const [shot] = shotOf(buildOptions(actor(3), shapes, tactics()));
    expect(shot?.weight).toBe(0);
  });

  it("weighs better finishers and attacking mentality higher, defensive lower", () => {
    const weight = (finishing: number, t: Partial<TeamTactics> = {}) => {
      const ps = players(3);
      ps[1] = anEnginePlayer("h1").withAttribute("finishing", finishing).build();
      const ctx: ActorContext = { side: "home", slot: 1, players: ps };
      return shotOf(buildOptions(ctx, near, tactics(t)))[0]?.weight ?? 0;
    };
    expect(weight(20)).toBeGreaterThan(weight(10));
    expect(weight(10)).toBeGreaterThan(weight(1));
    expect(weight(10, { mentality: "attacking" })).toBeGreaterThan(weight(10));
    expect(weight(10, { mentality: "defensive" })).toBeLessThan(weight(10));
  });

  it("lowers the shot weight under pressure", () => {
    const pressed: Shapes = { home: near.home, away: [at(95, 34), at(96, 35)] };
    const free = shotOf(buildOptions(nearActor(), near, tactics()))[0]?.weight ?? 0;
    const under = shotOf(buildOptions(nearActor(), pressed, tactics()))[0]?.weight ?? 0;
    expect(under).toBeLessThan(free);
  });
});

describe("buildOptions with tactics", () => {
  const weightOf = (o: ReturnType<typeof buildOptions>, type: string, variant?: string) =>
    o
      .filter(
        (x) =>
          x.type === type &&
          (variant === undefined || (x as { variant?: string }).variant === variant),
      )
      .reduce((s, x) => s + x.weight, 0);
  const crossShare = (t: Partial<TeamTactics>) => {
    const o = buildOptions(actor(), shapes, tactics(t));
    return weightOf(o, "pass", "cross") / weightOf(o, "pass");
  };

  it("gives wide a larger cross share than normal and narrow a smaller one", () => {
    expect(crossShare({ width: "wide" })).toBeGreaterThan(crossShare({}));
    expect(crossShare({ width: "narrow" })).toBeLessThan(crossShare({}));
  });

  const central = at(88, 34);
  const shotWeight = (t: Partial<TeamTactics>, from = central) =>
    weightOf(buildOptions(actor(0), { home: [from], away: farAway }, tactics(t)), "shot");

  it("lowers a central shot for wide and raises it for narrow, and leaves a wide-angle shot alone", () => {
    expect(shotWeight({ width: "wide" })).toBeLessThan(shotWeight({}));
    expect(shotWeight({ width: "narrow" })).toBeGreaterThan(shotWeight({}));
    expect(shotWeight({ width: "wide" }, at(88, 12))).toBe(shotWeight({}, at(88, 12)));
  });

  it("raises shot and risky pass weights for attacking and lowers them for defensive", () => {
    const risky = (m: TeamTactics["mentality"]) =>
      weightOf(buildOptions(actor(), shapes, tactics({ mentality: m })), "pass", "through");
    expect(shotWeight({ mentality: "attacking" })).toBeGreaterThan(shotWeight({}));
    expect(shotWeight({ mentality: "defensive" })).toBeLessThan(shotWeight({}));
    expect(risky("attacking")).toBeGreaterThan(risky("balanced"));
    expect(risky("defensive")).toBeLessThan(risky("balanced"));
  });

  it("raises through passes and carries after a won ball against a high press and lowers them against a low press", () => {
    const counter = (pressing: TeamTactics["pressing"], transition = true) => {
      const o = buildOptions(
        { ...actor(), foeTactics: tactics({ pressing }), transition },
        shapes,
        tactics(),
      );
      return [weightOf(o, "pass", "through"), weightOf(o, "carry")] as [number, number];
    };
    const [throughHigh, carryHigh] = counter("high");
    const [throughMedium, carryMedium] = counter("medium");
    const [throughLow, carryLow] = counter("low");
    expect(throughHigh).toBeGreaterThan(throughMedium);
    expect(carryHigh).toBeGreaterThan(carryMedium);
    expect(throughLow).toBeLessThan(throughMedium);
    expect(carryLow).toBeLessThan(carryMedium);
    expect(counter("high", false)).toEqual(counter("medium", false));
  });

  it("raises the shot weight after a won ball against a high press or an attacking opponent", () => {
    const counterShot = (foe: Partial<TeamTactics>, transition = true) =>
      weightOf(
        buildOptions(
          { ...actor(0), foeTactics: tactics(foe), transition },
          { home: [central], away: farAway },
          tactics(),
        ),
        "shot",
      );
    expect(counterShot({ pressing: "high" })).toBeGreaterThan(counterShot({}));
    expect(counterShot({ mentality: "attacking" })).toBeGreaterThan(counterShot({}));
    expect(counterShot({ mentality: "defensive" })).toBeLessThan(counterShot({}));
    expect(counterShot({ pressing: "high" }, false)).toBe(counterShot({}, false));
  });

  it("makes the opponent's press feel closer: more pressure lowers pass weight against a high press", () => {
    const close: Shapes = { home, away: [at(46, 34), at(100, 2)] };
    const total = (pressing: TeamTactics["pressing"]) =>
      weightOf(
        buildOptions({ ...actor(), foeTactics: tactics({ pressing }) }, close, tactics()),
        "pass",
      );
    expect(total("high")).toBeLessThan(total("medium"));
    expect(total("low")).toBeGreaterThan(total("medium"));
  });

  it("builds the same options without opponent tactics as with neutral ones", () => {
    expect(buildOptions({ ...actor(), foeTactics: NEUTRAL_TACTICS }, shapes, tactics())).toEqual(
      buildOptions(actor(), shapes, tactics()),
    );
  });
});
