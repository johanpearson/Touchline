import { describe, expect, it } from "vitest";
import {
  carry,
  clearance,
  foul,
  interception,
  pass,
  periodChange,
  setPiece,
  shot,
  tackle,
} from "./action-event-builders";
import { toPhases } from "./to-phases";

const at = (time: number, x = 50) => ({ time, from: { x: 40, y: 34 }, to: { x, y: 34 } });

describe("toPhases", () => {
  it("returns no phases for an empty log", () => {
    expect(toPhases([])).toEqual([]);
  });

  it("keeps the actions of one side's possession in one phase that ends in a turnover", () => {
    const phases = toPhases([
      pass("home", "h1", "h2", "complete", at(1)),
      carry("home", "h2", "kept", at(2)),
      pass("home", "h2", "h3", "complete", at(3)),
      pass("home", "h3", "h4", "intercepted", at(4)),
      interception("away", "a1", at(4.5)),
      pass("away", "a1", "a2", "complete", at(6)),
      pass("away", "a2", "a3", "complete", at(8)),
      pass("away", "a3", "a4", "complete", at(9)),
    ]);

    expect(phases.map((p) => [p.team, p.actions, p.outcome])).toEqual([
      ["home", [0, 1, 2, 3], "turnover"],
      ["away", [4, 5, 6, 7], "periodEnd"],
    ]);
  });

  it("ends a phase at a shot and starts the next one at the action after it", () => {
    const phases = toPhases([
      pass("home", "h1", "h2", "complete", at(1)),
      pass("home", "h2", "h3", "complete", at(2)),
      shot("home", "h3", "saved", 0.3, "gk", at(3, 95)),
      clearance("away", "a1", at(5)),
    ]);

    expect(phases[0]).toMatchObject({ actions: [0, 1, 2], outcome: "shot", danger: 0.3 });
    expect(phases[1]?.actions).toEqual([3]);
  });

  it("names a goal as the outcome of the phase that scored it", () => {
    const [phase] = toPhases([
      pass("home", "h1", "h2", "complete", at(1)),
      pass("home", "h2", "h3", "complete", at(2)),
      shot("home", "h3", "goal", 0.4, "gk", at(3, 100)),
    ]);

    expect(phase?.outcome).toBe("goal");
  });

  it("ends a phase at a foul and at a ball out of play", () => {
    const phases = toPhases([
      pass("home", "h1", "h2", "complete", at(1)),
      pass("home", "h2", "h3", "complete", at(2)),
      foul("home", "h3", "a1", at(3)),
      setPiece("home", "h3", "freeKick", at(10)),
      pass("home", "h3", "h4", "complete", at(11)),
      pass("home", "h4", "h5", "outOfPlay", at(12)),
    ]);

    expect(phases.map((p) => p.outcome)).toEqual(["foul", "outOfPlay"]);
  });

  it("counts a lost tackle as part of the dribbler's phase", () => {
    const phases = toPhases([
      pass("home", "h1", "h2", "complete", at(1)),
      tackle("away", "a1", "lost", at(2)),
      pass("home", "h2", "h3", "complete", at(3)),
      pass("home", "h3", "h4", "complete", at(4)),
    ]);

    expect(phases).toHaveLength(1);
    expect(phases[0]?.actions).toEqual([0, 1, 2, 3]);
  });

  it("starts the winner's phase at a won tackle", () => {
    const phases = toPhases([
      pass("home", "h1", "h2", "complete", at(1)),
      pass("home", "h2", "h3", "complete", at(2)),
      tackle("away", "a1", "won", at(3)),
      pass("away", "a1", "a2", "complete", at(4)),
      pass("away", "a2", "a3", "complete", at(5)),
    ]);

    expect(phases.map((p) => [p.team, p.actions])).toEqual([
      ["home", [0, 1]],
      ["away", [2, 3, 4]],
    ]);
  });

  it("never lets a phase cross a period", () => {
    const phases = toPhases([
      pass("home", "h1", "h2", "complete", at(1)),
      pass("home", "h2", "h3", "complete", at(2)),
      pass("home", "h3", "h4", "complete", at(3)),
      periodChange(2700, "halfTime"),
      { ...pass("home", "h1", "h2", "complete", at(2701)), period: "secondHalf" },
      { ...pass("home", "h2", "h3", "complete", at(2702)), period: "secondHalf" },
      { ...pass("home", "h3", "h4", "complete", at(2703)), period: "secondHalf" },
    ]);

    expect(phases.map((p) => [p.period, p.actions, p.outcome])).toEqual([
      ["firstHalf", [0, 1, 2], "periodEnd"],
      ["halfTime", [3], "periodEnd"],
      ["secondHalf", [4, 5, 6], "periodEnd"],
    ]);
  });

  it("merges a short quiet phase into the next phase of the same side", () => {
    const phases = toPhases([
      pass("home", "h1", "h2", "complete", at(1)),
      foul("home", "h2", "a1", at(2)),
      setPiece("home", "h2", "freeKick", at(8)),
      pass("home", "h2", "h3", "complete", at(9)),
      pass("home", "h3", "h4", "complete", at(10)),
      pass("home", "h4", "h5", "intercepted", at(11)),
    ]);

    expect(phases.map((p) => [p.team, p.actions, p.outcome])).toEqual([
      ["home", [0, 1, 2, 3, 4, 5], "turnover"],
    ]);
  });

  it("folds a brief spell of the other side between two spells of one side into the earlier phase", () => {
    const phases = toPhases([
      pass("home", "h1", "h2", "complete", at(1)),
      pass("home", "h2", "h3", "complete", at(2)),
      pass("home", "h3", "h4", "intercepted", at(3)),
      interception("away", "a1", at(4)),
      pass("away", "a1", "a2", "intercepted", at(5)),
      pass("home", "h4", "h5", "complete", at(6)),
      pass("home", "h5", "h6", "complete", at(7)),
      pass("home", "h6", "h7", "complete", at(8)),
      pass("home", "h7", "h8", "complete", at(9)),
    ]);

    expect(phases.map((p) => [p.team, p.actions])).toEqual([
      ["home", [0, 1, 2, 3, 4]],
      ["home", [5, 6, 7, 8]],
    ]);
  });

  it("merges a short quiet phase into the previous phase when the next one is the other side's", () => {
    const phases = toPhases([
      pass("home", "h1", "h2", "complete", at(1)),
      pass("home", "h2", "h3", "complete", at(2)),
      pass("home", "h3", "h4", "complete", at(3)),
      foul("home", "h4", "a1", at(4)),
      setPiece("home", "h4", "freeKick", at(10)),
      pass("home", "h4", "h5", "intercepted", at(11)),
      pass("away", "a1", "a2", "complete", at(12)),
      pass("away", "a2", "a3", "complete", at(13)),
      pass("away", "a3", "a4", "complete", at(14)),
    ]);

    expect(phases.map((p) => [p.team, p.actions])).toEqual([
      ["home", [0, 1, 2, 3, 4, 5]],
      ["away", [6, 7, 8]],
    ]);
  });

  it("keeps a short phase that ends in a shot", () => {
    const phases = toPhases([
      pass("away", "a1", "a2", "complete", at(1)),
      shot("home", "h1", "missed", 0.05, "gk", at(2, 90)),
      clearance("away", "a1", at(4)),
    ]);

    expect(phases[0]).toMatchObject({ team: "away", outcome: "turnover" });
    expect(phases.some((p) => p.outcome === "shot")).toBe(true);
  });

  it("describes a phase: times, passes, territory, danger and ball path", () => {
    const [phase] = toPhases([
      pass("home", "h1", "h2", "complete", {
        time: 10,
        from: { x: 30, y: 34 },
        to: { x: 45, y: 20 },
      }),
      carry("home", "h2", "kept", { time: 12, from: { x: 45, y: 20 }, to: { x: 60, y: 22 } }),
      pass("home", "h2", "h3", "complete", {
        time: 15,
        from: { x: 60, y: 22 },
        to: { x: 80, y: 30 },
      }),
      shot("home", "h3", "saved", 0.2, "gk", {
        time: 18,
        from: { x: 80, y: 30 },
        to: { x: 105, y: 34 },
      }),
    ]);

    expect(phase).toMatchObject({
      team: "home",
      period: "firstHalf",
      startTime: 10,
      endTime: 18,
      passes: 2,
      territory: 75,
      danger: 0.2,
      path: [
        { x: 30, y: 34 },
        { x: 45, y: 20 },
        { x: 60, y: 22 },
        { x: 80, y: 30 },
        { x: 105, y: 34 },
      ],
    });
  });

  it("measures territory towards the goal the away side attacks", () => {
    const [phase] = toPhases([
      pass("away", "a1", "a2", "complete", {
        time: 1,
        from: { x: 70, y: 34 },
        to: { x: 50, y: 34 },
      }),
      pass("away", "a2", "a3", "complete", {
        time: 2,
        from: { x: 50, y: 34 },
        to: { x: 40, y: 34 },
      }),
      pass("away", "a3", "a4", "complete", {
        time: 3,
        from: { x: 40, y: 34 },
        to: { x: 35, y: 34 },
      }),
    ]);

    expect(phase?.territory).toBe(35);
  });
});
