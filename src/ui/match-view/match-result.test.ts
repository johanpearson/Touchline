import { describe, expect, it } from "vitest";
import type { ActionEvent, ZoneEvent } from "../../engine";
import { goalsOf, matchOutcome } from "./match-result";

const shot = (actor: string, team: "home" | "away", time: number, outcome = "goal"): ActionEvent =>
  ({ type: "shot", actor, team, time, outcome, xg: 0.2, period: "firstHalf" }) as ActionEvent;

describe("matchOutcome", () => {
  it("is a win when the user's side scored more", () => {
    expect(matchOutcome({ home: 2, away: 1 }, "home")).toBe("win");
    expect(matchOutcome({ home: 0, away: 3 }, "away")).toBe("win");
  });

  it("is a draw when the score is level", () => {
    expect(matchOutcome({ home: 1, away: 1 }, "away")).toBe("draw");
  });

  it("is a defeat when the user's side scored fewer", () => {
    expect(matchOutcome({ home: 0, away: 2 }, "home")).toBe("defeat");
    expect(matchOutcome({ home: 2, away: 0 }, "away")).toBe("defeat");
  });
});

describe("goalsOf", () => {
  const names = { a: "Ek", b: "Lind", c: "Berg" };

  it("lists only goals, sorted by time, with the scorer's name and the minute", () => {
    const events = [
      shot("c", "away", 3000),
      shot("a", "home", 600),
      shot("b", "home", 1200, "saved"),
    ];
    const goals = goalsOf(events, [], names);
    expect(goals.map((g) => [g.name, g.side, g.minute])).toEqual([
      ["Ek", "home", "10’"],
      ["Berg", "away", "45+5’"],
    ]);
  });

  it("counts the second half on from 45 using the half-time event", () => {
    const zone = [
      { type: "periodChange", period: "halfTime", time: 2820 },
    ] as unknown as ZoneEvent[];
    const goals = goalsOf([shot("a", "home", 2820 + 120)], zone, names);
    expect(goals[0]?.minute).toBe("47’");
  });

  it("falls back to the id when the name is unknown", () => {
    expect(goalsOf([shot("zz", "home", 60)], [], names)[0]?.name).toBe("zz");
  });
});
