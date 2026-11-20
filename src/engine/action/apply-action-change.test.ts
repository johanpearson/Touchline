import { describe, expect, it, vi } from "vitest";
import { aMatchInput, aTeamSheet } from "./action-builders";
import type { ActionMatch, ActionMatchChange } from "./action-match";
import { createActionMatch } from "./create-action-match";
import type { EnginePlayer } from "./engine-player";

vi.setConfig({ testTimeout: 150_000 });

const input = aMatchInput().build();
const HALF_TIME_AT = 1_000_000;
const attacking = {
  mentality: "attacking",
  pressing: "high",
  width: "wide",
  tempo: "fast",
} as const;

const strongLineup = (prefix: string): EnginePlayer[] =>
  aTeamSheet("x", prefix)
    .build()
    .starters.map((p) => ({
      ...p,
      attributes: Object.fromEntries(Object.keys(p.attributes).map((k) => [k, 20])) as never,
    }));

const advanceInPieces = (match: ActionMatch, to: number, step: number) => {
  for (let t = step; t < to; t += step) match.advanceTo(t);
  match.advanceTo(to);
};

const playWithChange = (change: ActionMatchChange | undefined, step = HALF_TIME_AT) => {
  const match = createActionMatch(input, 5);
  advanceInPieces(match, HALF_TIME_AT, step);
  if (change) expect(match.applyChange(change)).toEqual({ ok: true });
  match.resume();
  advanceInPieces(match, HALF_TIME_AT, step);
  return match;
};

describe("ActionMatch.applyChange", () => {
  it("records a change with the time it was applied", () => {
    const match = createActionMatch(input, 1);
    match.advanceTo(600);
    const change: ActionMatchChange = { side: "home", tactics: attacking };
    match.applyChange(change);

    expect(match.changes).toEqual([{ time: match.state.time, change }]);
    expect(match.changes[0]?.time).toBe(600);
  });

  it("ignores a change after full time", () => {
    const match = playWithChange(undefined);

    expect(match.applyChange({ side: "home", tactics: attacking })).toEqual({ ok: true });
    expect(match.changes).toEqual([]);
  });

  it("leaves the log identical when the change sets the current values", () => {
    const same = {
      side: "home",
      lineup: input.home.starters,
      tactics: input.home.tactics,
    } as const;

    expect(playWithChange(same).events).toEqual(playWithChange(undefined).events);
  });

  it("gives the same log however time is split", () => {
    const change = { side: "away", lineup: strongLineup("s"), tactics: attacking } as const;

    expect(playWithChange(change, 137).events).toEqual(playWithChange(change).events);
  });

  it("changes the match when a stronger lineup comes on", () => {
    const change = { side: "home", lineup: strongLineup("s") } as const;

    expect(playWithChange(change).events).not.toEqual(playWithChange(undefined).events);
  });

  it("drives decisions with the new players' attributes", () => {
    const lineup = strongLineup("s");
    const strongMatch = playWithChange({ side: "home", lineup });
    const shotsAfter = (m: ActionMatch) =>
      m.events.filter((e) => e.type === "shot" && e.team === "home" && e.time > 2700);

    expect(
      strongMatch.events.some((e) => "actor" in e && lineup.some((p) => p.id === e.actor)),
    ).toBe(true);
    expect(shotsAfter(strongMatch).length).toBeGreaterThan(
      shotsAfter(playWithChange(undefined)).length,
    );
  });

  it("keeps the slot order of the snapshots after a substitution", () => {
    const match = playWithChange({ side: "home", lineup: strongLineup("s") });
    const counts = new Set(match.events.map((e) => e.snapshot?.players.length));

    expect(counts).toEqual(new Set([22]));
  });

  describe("rejects an invalid lineup without changing the match", () => {
    const reject = (lineup: readonly EnginePlayer[], code: string) => {
      const match = createActionMatch(input, 3);
      const before = structuredClone(match.events);
      const result = match.applyChange({ side: "home", lineup });

      expect(result.ok).toBe(false);
      expect(!result.ok && result.errors.map((e) => e.code)).toContain(code);
      expect(match.changes).toEqual([]);
      match.advanceTo(HALF_TIME_AT);
      const clean = createActionMatch(input, 3);
      clean.advanceTo(HALF_TIME_AT);
      expect(match.events.slice(0, before.length)).toEqual(before);
      expect(match.events).toEqual(clean.events);
    };

    it("with ten players", () => reject(input.home.starters.slice(1), "starterCount"));

    it("without a goalkeeper", () =>
      reject(
        input.home.starters.map((p) => (p.position === "GK" ? { ...p, position: "DEF" } : p)),
        "goalkeeperCount",
      ));

    it("with other formation lines", () =>
      reject(
        input.home.starters.map((p, i) => (i === 1 ? { ...p, position: "FWD" } : p)),
        "lineMismatch",
      ));

    it("with an attribute out of range", () =>
      reject(
        input.home.starters.map((p, i) =>
          i === 2 ? { ...p, attributes: { ...p.attributes, pace: 25 } } : p,
        ),
        "attributeRange",
      ));

    it("with a player of the other side", () =>
      reject(
        input.home.starters.map((p, i) => (i === 3 ? (input.away.starters[3] as EnginePlayer) : p)),
        "duplicateId",
      ));

    it("with a repeated player", () =>
      reject(
        input.home.starters.map((p, i) => (i === 3 ? (input.home.starters[4] as EnginePlayer) : p)),
        "duplicateId",
      ));
  });

  it("plays on in another formation from the next action, deterministically", () => {
    const formation = { defenders: 3, midfielders: 4, forwards: 3 };
    const shape = ["GK", "DEF", "DEF", "DEF", "MID", "MID", "MID", "MID", "FWD", "FWD", "FWD"];
    const lineup = input.home.starters.map((p, i) => ({
      ...p,
      position: shape[i] as EnginePlayer["position"],
    }));
    const run = () => {
      const match = createActionMatch(input, 5);
      match.advanceTo(HALF_TIME_AT);
      expect(match.applyChange({ side: "home", lineup, formation })).toEqual({ ok: true });
      match.resume();
      match.advanceTo(HALF_TIME_AT);
      return match;
    };

    const first = run();

    expect(first.changes).toHaveLength(1);
    expect(first.events).toEqual(run().events);
    expect(first.state.period).toBe("fullTime");
  });

  it("throws a RangeError for a side that does not exist", () => {
    const match = createActionMatch(input, 1);

    expect(() => match.applyChange({ side: "left" as never })).toThrow(RangeError);
  });
});
