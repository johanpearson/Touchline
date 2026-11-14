import { describe, expect, it, vi } from "vitest";
import { aMatchInputV2 } from "./action-builders";
import type { ActionEvent } from "./action-event";
import { createActionMatch } from "./create-action-match";
import { inPitch, PITCH_LENGTH, PITCH_WIDTH } from "./pitch-metres";

vi.setConfig({ testTimeout: 60_000 });

const SEEDS = [1, 2, 3, 4, 5, 6];
const matches = SEEDS.map((seed) => {
  const match = createActionMatch(aMatchInputV2().build(), seed);
  match.advanceTo(10_000);
  match.resume();
  match.advanceTo(20_000);
  return match;
});

const afterSetPieces = (variant: string) =>
  matches.flatMap((m) =>
    m.events.flatMap((e, i) =>
      e.type === "setPiece" && e.variant === variant && m.events[i + 1] !== undefined
        ? [{ setPiece: e, next: m.events[i + 1] as ActionEvent }]
        : [],
    ),
  );

describe("set pieces in the match loop", () => {
  it("follows a corner with a cross by the same side", () => {
    const pairs = afterSetPieces("corner");

    expect(pairs.length).toBeGreaterThan(5);
    for (const { setPiece, next } of pairs) {
      if (next.type === "periodChange") continue;
      expect(next).toMatchObject({ type: "pass", variant: "cross", team: setPiece.team });
      expect((next as { actor: string }).actor).toBe((setPiece as { actor: string }).actor);
    }
  });

  it("follows a throw-in with a short throw and a goal kick with a long kick", () => {
    for (const { next } of afterSetPieces("throwIn")) {
      if (next.type === "periodChange") continue;
      expect(next).toMatchObject({ type: "pass", variant: "short" });
    }
    for (const { next } of afterSetPieces("goalKick")) {
      if (next.type === "periodChange") continue;
      expect(next).toMatchObject({ type: "pass", variant: "long" });
    }
  });

  it("follows a free kick in shooting range with a direct shot", () => {
    const shots = afterSetPieces("freeKick").filter(({ next }) => next.type === "shot");

    expect(shots.length).toBeGreaterThan(0);
    for (const { setPiece, next } of shots) {
      expect(next.team).toBe(setPiece.team);
    }
  });

  it("follows a penalty with a shot by the taker", () => {
    for (const { setPiece, next } of afterSetPieces("penalty")) {
      expect(next).toMatchObject({ type: "shot", team: setPiece.team });
    }
  });

  it("gives a penalty for a foul inside the box and a free kick elsewhere", () => {
    let fouls = 0;
    for (const m of matches) {
      m.events.forEach((e, i) => {
        if (e.type !== "foul") return;
        const next = m.events[i + 1];
        if (next?.type !== "setPiece") return;
        const depth = e.team === "home" ? PITCH_LENGTH - e.from.x : e.from.x;
        const inBox = depth <= 16.5 && Math.abs(e.from.y - PITCH_WIDTH / 2) <= 20.16;
        expect(e.outcome).toBe(inBox ? "penalty" : "freeKick");
        expect(next.variant).toBe(inBox ? "penalty" : "freeKick");
        fouls++;
      });
    }
    expect(fouls).toBeGreaterThan(10);
  });

  it("counts fouls committed per team", () => {
    for (const m of matches) {
      const committed = { home: 0, away: 0 };
      for (const e of m.events)
        if (e.type === "foul") committed[e.team === "home" ? "away" : "home"]++;

      expect(m.state.fouls).toEqual(committed);
    }
  });

  it("keeps 22 players inside the pitch and the ball on the spot in every set-piece snapshot", () => {
    for (const m of matches) {
      for (const e of m.events) {
        if (e.type !== "setPiece") continue;
        expect(e.snapshot?.players).toHaveLength(22);
        expect(e.snapshot?.players.every(inPitch)).toBe(true);
        expect(e.snapshot?.ball).toEqual(e.from);
        if (e.variant === "throwIn") expect(e.from.y === 0 || e.from.y === PITCH_WIDTH).toBe(true);
        if (e.variant === "corner") {
          expect(e.from.x === 0 || e.from.x === PITCH_LENGTH).toBe(true);
          expect(e.from.y === 0 || e.from.y === PITCH_WIDTH).toBe(true);
        }
      }
    }
  });
});
