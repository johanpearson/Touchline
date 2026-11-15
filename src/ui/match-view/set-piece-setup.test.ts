import { describe, expect, it } from "vitest";
import type { ActionEvent, PositionSnapshot } from "../../engine";
import { activeSetPiece } from "./set-piece-setup";

const snapshot: PositionSnapshot = {
  ball: { x: 105, y: 0 },
  players: Array.from({ length: 22 }, (_, i) => ({ x: 100 - i, y: 20 })),
};

const setPiece = (
  time: number,
  variant: "corner" | "penalty",
  team: "home" | "away",
  taker: number,
): ActionEvent => ({
  type: "setPiece",
  variant,
  outcome: "taken",
  time,
  period: "firstHalf",
  team,
  actor: "t",
  from: snapshot.players[taker] ?? { x: 0, y: 0 },
  to: snapshot.players[taker] ?? { x: 0, y: 0 },
  pressure: 0,
  snapshot,
});

const cross = (time: number): ActionEvent => ({
  type: "pass",
  variant: "cross",
  outcome: "complete",
  time,
  period: "firstHalf",
  team: "home",
  actor: "t",
  target: "u",
  from: { x: 105, y: 0 },
  to: { x: 95, y: 30 },
  pressure: 0,
  snapshot,
});

describe("activeSetPiece", () => {
  const events = [setPiece(10, "corner", "home", 4), cross(13)];

  it("describes a set piece from its time until the first action", () => {
    expect(activeSetPiece(events, 10)).toEqual({ variant: "corner", team: "home", taker: 4 });
    expect(activeSetPiece(events, 12.9)).toEqual({ variant: "corner", team: "home", taker: 4 });
  });

  it("ends when the first action is taken", () => {
    expect(activeSetPiece(events, 13)).toBeUndefined();
    expect(activeSetPiece(events, 20)).toBeUndefined();
  });

  it("is undefined before the set piece", () => {
    expect(activeSetPiece(events, 9)).toBeUndefined();
  });

  it("finds the taker among the away players for an away set piece", () => {
    expect(activeSetPiece([setPiece(10, "penalty", "away", 15)], 11)).toEqual({
      variant: "penalty",
      team: "away",
      taker: 15,
    });
  });

  it("holds until the end of the log when no action follows", () => {
    expect(activeSetPiece([setPiece(10, "penalty", "home", 9)], 50)?.variant).toBe("penalty");
  });
});
