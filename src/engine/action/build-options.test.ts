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
