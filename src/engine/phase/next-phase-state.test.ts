import { describe, expect, it } from "vitest";
import { aTeamSheet } from "../action/action-builders";
import { nextPhaseState } from "./next-phase-state";
import { aChance, aStep } from "./phase-builders";
import { kickoffState } from "./phase-state";

const state = kickoffState(
  { home: aTeamSheet("Home", "h").build(), away: aTeamSheet("Away", "a").build() },
  2700,
);
const at = (x: number, y: number) =>
  [
    { player: "h1", at: { x: 40, y: 30 } },
    { player: "h2", at: { x, y } },
  ] as const;

describe("nextPhaseState", () => {
  it("gives the ball to the other side after a tackle or an interception, where it was lost", () => {
    const tackled = aStep().withChain(at(60, 20)).endingLost("tackle").between(0, 14).build();
    const stolen = aStep().withChain(at(60, 20)).endingLost("badPass").build();

    expect(nextPhaseState(state, tackled)).toMatchObject({
      team: "away",
      start: "tackle",
      ball: { x: 60, y: 20 },
      time: 14,
    });
    expect(nextPhaseState(state, stolen)).toMatchObject({ team: "away", start: "interception" });
  });

  it("gives the fouled side a free kick or a penalty", () => {
    const free = aStep().withChain(at(70, 30)).endingInFoul("a2", false).build();
    const penalty = aStep().endingInFoul("a2", true).build();

    expect(nextPhaseState(state, free)).toMatchObject({
      team: "home",
      start: "freeKick",
      ball: { x: 70, y: 30 },
    });
    expect(nextPhaseState(state, penalty)).toMatchObject({
      team: "home",
      start: "penalty",
      ball: { x: 94, y: 34 },
    });
  });

  it("gives the defender a throw-in at the sideline or a goal kick over the end line", () => {
    const side = aStep().withChain(at(60, 0)).endingOutOfPlay().build();
    const end = aStep().withChain(at(105, 20)).endingOutOfPlay().build();

    expect(nextPhaseState(state, side)).toMatchObject({
      team: "away",
      start: "throwIn",
      ball: { x: 60, y: 0 },
    });
    expect(nextPhaseState(state, end)).toMatchObject({
      team: "away",
      start: "goalKick",
      ball: { x: 99.5, y: 34 },
    });
  });

  it("mirrors a goal kick for the home side defending x = 0", () => {
    const end = aStep().forTeam("away").withChain(at(0, 20)).endingOutOfPlay().build();

    expect(nextPhaseState(state, end)).toMatchObject({
      team: "home",
      start: "goalKick",
      ball: { x: 5.5, y: 34 },
    });
  });

  it.each([
    ["kickoff", "away", "kickoff"],
    ["goalKick", "away", "goalKick"],
    ["corner", "home", "corner"],
    ["rebound", "away", "interception"],
  ] as const)("restarts after a chance with aftermath %s", (aftermath, team, start) => {
    const step = aStep().endingInChance(aChance().withAftermath(aftermath).build()).build();

    expect(nextPhaseState(state, step)).toMatchObject({ team, start });
  });

  it("puts a rebound in front of the goal the shot was taken at, won by the defence", () => {
    const step = aStep()
      .endingInChance({ ...aChance().withAftermath("rebound").build(), from: { x: 94, y: 24 } })
      .build();

    expect(nextPhaseState(state, step)?.ball).toEqual({ x: 94, y: 29 });
  });

  it("takes a corner from the side of the shot", () => {
    const high = aChance().build();
    const step = aStep()
      .endingInChance({ ...high, from: { x: 95, y: 60 } })
      .build();

    expect(nextPhaseState(state, step)?.ball).toEqual({ x: 105, y: 68 });
  });

  it("ends the draw after a period end", () => {
    expect(nextPhaseState(state, aStep().endingAtPeriodEnd().build())).toBeUndefined();
  });
});
