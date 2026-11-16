import { describe, expect, it } from "vitest";
import type { ActionEvent } from "../engine";
import { goalScorersOf } from "./goal-scorers";

const shot = (actor: string, outcome: "goal" | "saved", time: number): ActionEvent =>
  ({ type: "shot", actor, outcome, time }) as unknown as ActionEvent;
const pass = (actor: string, time: number): ActionEvent =>
  ({ type: "pass", actor, outcome: "complete", time }) as unknown as ActionEvent;

describe("goalScorersOf", () => {
  it("lists the shooter of every goal in the order the goals were scored", () => {
    const events = [
      shot("a", "goal", 10),
      pass("b", 14),
      shot("c", "goal", 20),
      shot("a", "goal", 90),
    ];

    expect(goalScorersOf(events)).toEqual(["a", "c", "a"]);
  });

  it("ignores shots that did not score and other actions", () => {
    expect(goalScorersOf([shot("a", "saved", 5), pass("b", 8)])).toEqual([]);
  });

  it("returns an empty list for an empty log", () => {
    expect(goalScorersOf([])).toEqual([]);
  });
});
