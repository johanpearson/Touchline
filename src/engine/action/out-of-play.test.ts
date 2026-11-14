import { describe, expect, it } from "vitest";
import { exitPoint, restartAfterOutOfPlay } from "./out-of-play";

describe("exitPoint", () => {
  it("leaves over the touchline when the ball travels sideways", () => {
    const exit = exitPoint({ x: 50, y: 60 }, { x: 50, y: 66 });
    expect(exit.boundary).toBe("sideLine");
    expect(exit.point.y).toBeCloseTo(68, 6);
    expect(exit.point.x).toBeCloseTo(50, 6);
  });

  it("leaves over the goal line when the ball travels along the pitch", () => {
    const exit = exitPoint({ x: 90, y: 20 }, { x: 100, y: 20 });
    expect(exit.boundary).toBe("endLine");
    expect(exit.point.x).toBeCloseTo(105, 6);
  });

  it("falls back to the attacking goal line when the pass has no direction", () => {
    expect(exitPoint({ x: 50, y: 34 }, { x: 50, y: 34 }).boundary).toBe("endLine");
  });
});

describe("restartAfterOutOfPlay", () => {
  it("gives the opponent a throw-in at the exit point", () => {
    const restart = restartAfterOutOfPlay("home", { point: { x: 40, y: 0 }, boundary: "sideLine" });
    expect(restart).toEqual({ team: "away", variant: "throwIn", position: { x: 40, y: 0 } });
  });

  it("gives a goal kick to the defenders when the attackers put it behind", () => {
    const restart = restartAfterOutOfPlay("home", {
      point: { x: 105, y: 30 },
      boundary: "endLine",
    });
    expect(restart).toEqual({ team: "away", variant: "goalKick", position: { x: 99.5, y: 34 } });
  });

  it("gives a corner when a side puts the ball behind its own goal line", () => {
    const restart = restartAfterOutOfPlay("home", { point: { x: 0, y: 50 }, boundary: "endLine" });
    expect(restart).toEqual({ team: "away", variant: "corner", position: { x: 0, y: 68 } });
  });

  it("mirrors the cases for the away side", () => {
    expect(
      restartAfterOutOfPlay("away", { point: { x: 105, y: 10 }, boundary: "endLine" }),
    ).toEqual({ team: "home", variant: "corner", position: { x: 105, y: 0 } });
    expect(restartAfterOutOfPlay("away", { point: { x: 0, y: 10 }, boundary: "endLine" })).toEqual({
      team: "home",
      variant: "goalKick",
      position: { x: 5.5, y: 34 },
    });
  });
});
