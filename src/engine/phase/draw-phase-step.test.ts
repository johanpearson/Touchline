import { describe, expect, it } from "vitest";
import { aTeamSheet } from "../action/action-builders";
import { inPitch } from "../action/pitch-metres";
import { createRng, type Rng } from "../rng";
import { drawPhaseStep } from "./draw-phase-step";
import { kickoffState, type PhaseState } from "./phase-state";
import type { PhaseStep } from "./phase-step";
import { drawHalf } from "./simulate-steps";

const sheets = { home: aTeamSheet("Home", "h").build(), away: aTeamSheet("Away", "a").build() };
const homeIds = new Set(sheets.home.starters.map((p) => p.id));
const awayIds = new Set(sheets.away.starters.map((p) => p.id));

/** An Rng that returns `values` from `next` in order and 0.5 afterwards. */
const scripted = (...values: number[]): Rng => {
  let index = 0;
  const next = (): number => values[index++] ?? 0.5;
  const rng: Rng = {
    next,
    int: (min, max) => min + Math.floor(next() * (max - min + 1)),
    pick: (list) => list[Math.floor(next() * list.length)] as never,
    chance: (p) => next() < p,
    fork: () => rng,
  };
  return rng;
};

const state = (changes: Partial<PhaseState> = {}): PhaseState => ({
  ...kickoffState(sheets, 2700),
  ...changes,
});

const FAIL = 0.999;
const PASS = 0.001;

describe("drawPhaseStep", () => {
  it("loses the ball with a short chain when the first stage fails", () => {
    // stage draw fails, failure kind is a lost ball, then a tackle
    const step = drawPhaseStep(state(), scripted(FAIL, 0.5, 0.1));

    expect(step).toMatchObject({ outcome: "lost", how: "tackle", team: "home", start: "kickoff" });
    expect(step.chain.length).toBeGreaterThanOrEqual(2);
    expect(step.chain.length).toBeLessThanOrEqual(3);
    expect(step.chain.every((link) => homeIds.has(link.player))).toBe(true);
    expect(awayIds.has((step as { challenger: string }).challenger)).toBe(true);
  });

  it.each([
    [0.4, "interception"],
    [0.9, "badPass"],
  ] as const)("draws how the ball is lost: %s gives %s", (draw, how) => {
    const step = drawPhaseStep(state(), scripted(FAIL, 0.5, draw));

    expect(step).toMatchObject({ outcome: "lost", how });
  });

  it("gives a foul on the attacking side, committed by a defender", () => {
    const step = drawPhaseStep(state(), scripted(FAIL, 0.05));

    expect(step).toMatchObject({ outcome: "foul", team: "home", penalty: false });
    expect(awayIds.has((step as { offender: string }).offender)).toBe(true);
  });

  it("puts the last waypoint of an out-of-play possession on a line", () => {
    const step = drawPhaseStep(state(), scripted(FAIL, 0.15));
    const last = step.chain[step.chain.length - 1];

    expect(step.outcome).toBe("outOfPlay");
    expect(last && inPitch(last.at)).toBe(true);
    expect([0, 68, 105]).toContain(last?.at.y === 0 || last?.at.y === 68 ? last.at.y : last?.at.x);
  });

  it("awards a penalty for a foul in the final third that draws the penalty share", () => {
    const corner = state({ start: "corner", ball: { x: 105, y: 0 } });

    const step = drawPhaseStep(corner, scripted(FAIL, 0.05, 0.5, 0.001));

    expect(step).toMatchObject({ outcome: "foul", penalty: true });
  });

  it("ends in a chance when every stage is passed, shot by the last player of the chain", () => {
    const step = drawPhaseStep(state(), scripted(PASS, PASS, PASS));

    expect(step.outcome).toBe("chance");
    if (step.outcome !== "chance") return;
    const shooter = step.chain[step.chain.length - 1];
    expect(step.chance.shooter).toBe(shooter?.player);
    expect(step.chance.from).toEqual(shooter?.at);
    expect(step.chance.creator).toBe(step.chain[step.chain.length - 2]?.player);
    expect(step.chance.keeper).toBe("a-1");
    expect(step.chance.xg).toBeGreaterThan(0);
    expect(step.chain.length).toBeGreaterThanOrEqual(4);
  });

  it("starts a goal kick with the goalkeeper", () => {
    const kick = state({ start: "goalKick", ball: { x: 5.5, y: 34 } });

    const step = drawPhaseStep(kick, scripted(FAIL, 0.5, 0.1));

    expect(step.chain[0]?.player).toBe("h-1");
  });

  it("starts a possession from a corner in the final stage", () => {
    const corner = state({ start: "corner", ball: { x: 105, y: 68 } });

    const step = drawPhaseStep(corner, scripted(PASS));

    expect(step.outcome).toBe("chance");
    expect(step.chain[0]?.at).toEqual({ x: 105, y: 68 });
    if (step.outcome === "chance") expect(step.chance.kind).toBe("setPiece");
  });

  it("takes a penalty with a single taker and no stage draws", () => {
    const spot = state({ start: "penalty", ball: { x: 94, y: 34 } });

    const step = drawPhaseStep(spot, createRng(3));

    expect(step.chain).toHaveLength(1);
    expect(step).toMatchObject({ outcome: "chance", start: "penalty" });
    if (step.outcome === "chance") expect(step.chance.kind).toBe("penalty");
  });

  it("ends the period when the step reaches its end, never shorter than 10 s", () => {
    const late = state({ time: 2695, periodEndsAt: 2700 });

    const step = drawPhaseStep(late, scripted(PASS, PASS, PASS));

    expect(step.outcome).toBe("periodEnd");
    expect(step.endTime).toBeGreaterThanOrEqual(2705);
  });

  it("mirrors the pitch for the away side, which attacks towards x = 0", () => {
    const away = state({ team: "away", ball: { x: 52.5, y: 34 } });

    const step = drawPhaseStep(away, scripted(PASS, PASS, PASS));
    const last = step.chain[step.chain.length - 1];

    expect(last?.at.x).toBeLessThan(25);
    expect(step.chain.every((link) => awayIds.has(link.player))).toBe(true);
  });

  it("is deterministic for a seed", () => {
    expect(drawHalf(sheets, 7)).toEqual(drawHalf(sheets, 7));
    expect(drawHalf(sheets, 7)).not.toEqual(drawHalf(sheets, 8));
  });
});

describe("drawPhaseStep over a seeded half", () => {
  const steps: PhaseStep[] = drawHalf(sheets, 11);

  it("keeps every step 10 to 25 s long, in order and without a gap", () => {
    for (const [index, step] of steps.entries()) {
      const seconds = step.endTime - step.startTime;
      expect(seconds).toBeGreaterThanOrEqual(10);
      expect(seconds).toBeLessThanOrEqual(25.01);
      if (index > 0) expect(step.startTime).toBe(steps[index - 1]?.endTime);
    }
  });

  it("keeps chains of 2 to 6 players on the pitch, never the same player twice in a row", () => {
    for (const step of steps) {
      if (step.start === "penalty") continue;
      expect(step.chain.length).toBeGreaterThanOrEqual(2);
      expect(step.chain.length).toBeLessThanOrEqual(6);
      step.chain.forEach((link, i) => {
        expect(inPitch(link.at)).toBe(true);
        if (i > 0) expect(link.player).not.toBe(step.chain[i - 1]?.player);
      });
    }
  });

  it("ends the half with exactly one period end", () => {
    expect(steps.filter((s) => s.outcome === "periodEnd")).toHaveLength(1);
    expect(steps[steps.length - 1]?.outcome).toBe("periodEnd");
  });
});
