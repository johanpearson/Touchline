import { describe, expect, it } from "vitest";
import type { EnginePlayer, MatchInput, TimedActionMatchChange } from "../../engine";
import { lineupAt } from "./lineup-state";

const player = (id: string, position: EnginePlayer["position"] = "MID"): EnginePlayer => ({
  id,
  position,
  attributes: {
    passing: 10,
    ballControl: 10,
    dribbling: 10,
    pace: 10,
    vision: 10,
    finishing: 10,
    workRate: 10,
    tackling: 10,
    positioning: 10,
    strength: 10,
    handling: 10,
    reflexes: 10,
  },
});

const sheet = (prefix: string) => ({
  name: prefix,
  formation: { defenders: 0, midfielders: 2, forwards: 0 },
  starters: [player(`${prefix}1`), player(`${prefix}2`)],
  bench: [player(`${prefix}3`), player(`${prefix}4`)],
  tactics: { mentality: "balanced", pressing: "medium", width: "normal", tempo: "normal" } as const,
});
const input = { engineVersion: 2, home: sheet("h"), away: sheet("a") } as MatchInput;

const swap: TimedActionMatchChange = {
  time: 3000,
  change: { side: "home", lineup: [player("h1"), player("h3")] },
};

const ids = (players: readonly EnginePlayer[]) => players.map((p) => p.id);

describe("lineupAt", () => {
  it("starts with the starters on the pitch and the substitutes on the bench", () => {
    const state = lineupAt(input, [], 0);
    expect(ids(state.home.onPitch)).toEqual(["h1", "h2"]);
    expect(ids(state.home.bench)).toEqual(["h3", "h4"]);
    expect(state.home.off).toEqual([]);
  });

  it("does not show a change before the presented time reaches it", () => {
    const state = lineupAt(input, [swap], 2999);
    expect(ids(state.home.onPitch)).toEqual(["h1", "h2"]);
  });

  it("moves the player who came on to the pitch and the one who left to the off list", () => {
    const state = lineupAt(input, [swap], 3000);
    expect(ids(state.home.onPitch)).toEqual(["h1", "h3"]);
    expect(ids(state.home.bench)).toEqual(["h4"]);
    expect(ids(state.home.off)).toEqual(["h2"]);
    expect(ids(state.away.onPitch)).toEqual(["a1", "a2"]);
  });

  it("ignores changes of tactics only", () => {
    const tactics: TimedActionMatchChange = {
      time: 10,
      change: { side: "away", tactics: input.away.tactics },
    };
    expect(ids(lineupAt(input, [tactics], 100).away.onPitch)).toEqual(["a1", "a2"]);
  });
});
