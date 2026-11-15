import { describe, expect, it } from "vitest";
import { NEUTRAL_TACTICS } from "../tactics";
import { aTeamSheet } from "./action-builders";
import type { Point } from "./pitch-metres";
import {
  BALL_CLOSE_IN,
  BALL_PULL_DEPTH,
  BALL_PULL_DEPTH_MAX,
  BALL_PULL_LATERAL,
  BALL_PULL_LATERAL_MAX,
  CENTRE_Y,
  GOALKEEPER_FOLLOW,
  HALF_WAY,
  PHASE_SHIFT,
} from "./shape-constants";
import { formationAnchors, teamShape } from "./team-shape";

const sheet = aTeamSheet().build();
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const PHASE = "progression" as const;

/** The home block of neutral tactics before the ball acts: anchors moved by the phase shift. */
const blockOf = (): Point[] =>
  formationAnchors(sheet.formation).map((a, slot) => ({
    x: slot === 0 ? a.depth + PHASE_SHIFT[PHASE] * GOALKEEPER_FOLLOW : a.depth + PHASE_SHIFT[PHASE],
    y: a.y,
  }));

/** The documented effect of the ball: the outfield block follows it, then the nearest players close in. */
const modelled = (ball: Point): Point[] => {
  const dx = clamp(
    BALL_PULL_DEPTH * (ball.x - HALF_WAY),
    -BALL_PULL_DEPTH_MAX,
    BALL_PULL_DEPTH_MAX,
  );
  const dy = clamp(
    BALL_PULL_LATERAL * (ball.y - CENTRE_Y),
    -BALL_PULL_LATERAL_MAX,
    BALL_PULL_LATERAL_MAX,
  );
  const pulled = blockOf().map((p, slot) => (slot === 0 ? p : { x: p.x + dx, y: p.y + dy }));
  const ranked = pulled
    .map((p, slot) => ({ slot, d: Math.hypot(p.x - ball.x, p.y - ball.y) }))
    .filter(({ slot }) => slot !== 0)
    .sort((a, b) => a.d - b.d || a.slot - b.slot)
    .slice(0, BALL_CLOSE_IN.length);
  const result = [...pulled];
  ranked.forEach(({ slot, d }, rank) => {
    const { share, maxMetres } = BALL_CLOSE_IN[rank] as { share: number; maxMetres: number };
    const p = pulled[slot] as Point;
    if (d === 0) return;
    const step = Math.min(d * share, maxMetres);
    result[slot] = {
      x: p.x + ((ball.x - p.x) / d) * step,
      y: p.y + ((ball.y - p.y) / d) * step,
    };
  });
  return result;
};

const actual = (ball: Point) => teamShape(sheet, NEUTRAL_TACTICS, PHASE, ball, "home");
const expectSame = (got: Point[], want: Point[]) => {
  got.forEach((p, i) => {
    expect(p.x).toBeCloseTo((want[i] as Point).x, 9);
    expect(p.y).toBeCloseTo((want[i] as Point).y, 9);
  });
};

describe("teamShape ball effects", () => {
  it.each([
    ["far on the right wing", { x: 60, y: 60 }],
    ["far on the left wing", { x: 70, y: 8 }],
    ["deep in the own half", { x: 20, y: 40 }],
    ["on the halfway line centre", { x: 52.5, y: 34 }],
    ["in the attacking box", { x: 95, y: 30 }],
    ["so far away that the first step is capped", { x: 100, y: 2 }],
  ])("pulls the block and closes the nearest two players in on a ball %s", (_label, ball) => {
    expectSame(actual(ball), modelled(ball));
  });

  it("leaves the goalkeeper alone even when the ball is next to it", () => {
    const ball = { x: 8, y: 34 };
    const keeper = actual(ball)[0] as Point;
    const block = blockOf()[0] as Point;
    expect(keeper.x).toBeCloseTo(block.x, 9);
    expect(keeper.y).toBeCloseTo(block.y, 9);
  });

  it("does not move a player who already stands on the ball", () => {
    const pulledAnchor = (() => {
      const base = blockOf()[9] as Point;
      return { x: base.x, y: base.y };
    })();
    const ball = {
      x: pulledAnchor.x + BALL_PULL_DEPTH * (pulledAnchor.x - HALF_WAY),
      y: pulledAnchor.y,
    };
    const got = actual(ball);
    for (const p of got) {
      expect(Number.isFinite(p.x)).toBe(true);
      expect(Number.isFinite(p.y)).toBe(true);
    }
    expectSame(got, modelled(ball));
  });
});
