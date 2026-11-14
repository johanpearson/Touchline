import { describe, expect, it } from "vitest";
import type { ActionEvent, PassEvent, ShotEvent } from "./action-event";
import { markKeyPasses } from "./mark-key-passes";

const snapshot = { ball: { x: 0, y: 0 }, players: [] };
const base = {
  time: 1,
  period: "firstHalf" as const,
  from: { x: 0, y: 0 },
  to: { x: 1, y: 1 },
  pressure: 0,
  snapshot,
};
const pass = (
  team: "home" | "away",
  actor: string,
  target: string,
  outcome: PassEvent["outcome"] = "complete",
): PassEvent => ({
  ...base,
  type: "pass",
  variant: "short",
  team,
  actor,
  target,
  outcome,
});
const shot = (team: "home" | "away", actor: string): ShotEvent => ({
  ...base,
  type: "shot",
  team,
  actor,
  outcome: "saved",
  xg: 0.1,
});
const flags = (events: readonly ActionEvent[]) =>
  events.map((e) => (e.type === "pass" ? (e.keyPass ?? false) : null));

describe("markKeyPasses", () => {
  it("marks the completed pass directly before a shot by its receiver", () => {
    const out = markKeyPasses([pass("home", "a", "b"), shot("home", "b")]);
    expect(flags(out)).toEqual([true, null]);
  });

  it("leaves passes without a following shot unmarked", () => {
    expect(flags(markKeyPasses([pass("home", "a", "b"), pass("home", "b", "c")]))).toEqual([
      false,
      false,
    ]);
  });

  it("does not mark a pass when the shot comes from another player, team or after a failed pass", () => {
    expect(flags(markKeyPasses([pass("home", "a", "b"), shot("home", "c")]))).toEqual([
      false,
      null,
    ]);
    expect(flags(markKeyPasses([pass("home", "a", "b"), shot("away", "b")]))).toEqual([
      false,
      null,
    ]);
    expect(
      flags(markKeyPasses([pass("home", "a", "b", "intercepted"), shot("home", "b")])),
    ).toEqual([false, null]);
  });

  it("does not mutate the input events", () => {
    const events = [pass("home", "a", "b"), shot("home", "b")];
    markKeyPasses(events);
    expect((events[0] as PassEvent).keyPass).toBeUndefined();
  });
});
