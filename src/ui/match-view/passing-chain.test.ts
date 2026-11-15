import { describe, expect, it } from "vitest";
import type { ActionEvent, PositionSnapshot } from "../../engine";
import { chainLines, passingChain } from "./passing-chain";

const snapshot: PositionSnapshot = {
  ball: { x: 0, y: 0 },
  players: Array.from({ length: 22 }, (_, i) => ({ x: i * 4, y: 10 })),
};

type Common = { time: number; team?: "home" | "away"; period?: "firstHalf" | "secondHalf" };
const base = ({ time, team = "home", period = "firstHalf" }: Common) => ({
  time,
  period,
  team,
  from: { x: 0, y: 0 },
  to: { x: 0, y: 0 },
  pressure: 0,
});
const pass = (
  c: Common,
  actor: string,
  target: string,
  from: { x: number; y: number },
  to: { x: number; y: number },
  outcome: "complete" | "intercepted" | "incomplete" = "complete",
): ActionEvent => ({
  ...base(c),
  type: "pass",
  variant: "short",
  outcome,
  actor,
  target,
  from,
  to,
  snapshot,
});

const a = { x: 0, y: 10 };
const b = { x: 4, y: 10 };
const c = { x: 8, y: 10 };

describe("passingChain", () => {
  const chain = [pass({ time: 10 }, "a", "b", a, b), pass({ time: 14 }, "b", "c", b, c)];

  it("returns the consecutive completed passes in order, oldest first", () => {
    expect(passingChain(chain, 14, 20)).toEqual([
      { from: a, to: b, actor: "a", target: "b" },
      { from: b, to: c, actor: "b", target: "c" },
    ]);
  });

  it("ignores passes after the given time", () => {
    expect(passingChain(chain, 12, 20)).toHaveLength(1);
  });

  it("drops passes older than the window", () => {
    expect(passingChain(chain, 14, 3)).toEqual([{ from: b, to: c, actor: "b", target: "c" }]);
  });

  it("keeps the chain across carries by the same team", () => {
    const events = [
      chain[0] as ActionEvent,
      { ...base({ time: 12 }), type: "carry", outcome: "kept", actor: "b" } as ActionEvent,
      chain[1] as ActionEvent,
    ];
    expect(passingChain(events, 14, 20)).toHaveLength(2);
  });

  it("is broken by an interception", () => {
    const events = [
      chain[0] as ActionEvent,
      pass({ time: 12 }, "b", "c", b, c, "intercepted"),
      { ...base({ time: 12.5, team: "away" }), type: "interception", outcome: "won", actor: "x" },
      pass({ time: 15, team: "away" }, "x", "y", c, b),
    ] as ActionEvent[];
    expect(passingChain(events, 15, 20)).toEqual([{ from: c, to: b, actor: "x", target: "y" }]);
  });

  it("is broken by a restart", () => {
    const events = [
      chain[0] as ActionEvent,
      { ...base({ time: 12 }), type: "setPiece", variant: "throwIn", outcome: "taken", actor: "b" },
      chain[1] as ActionEvent,
    ] as ActionEvent[];
    expect(passingChain(events, 14, 20)).toEqual([{ from: b, to: c, actor: "b", target: "c" }]);
  });

  it("is broken by a period change", () => {
    const events = [
      pass({ time: 10 }, "a", "b", a, b),
      { ...base({ time: 12 }), type: "periodChange" },
      pass({ time: 13, period: "secondHalf" }, "b", "c", b, c),
    ] as ActionEvent[];
    expect(passingChain(events, 13, 20)).toHaveLength(1);
  });

  it("is empty when the last action is not a pass", () => {
    const events = [
      chain[0] as ActionEvent,
      { ...base({ time: 12 }), type: "shot", outcome: "saved", xg: 0.1, actor: "b" },
    ] as ActionEvent[];
    expect(passingChain(events, 12, 20)).toEqual([]);
  });
});

describe("chainLines", () => {
  it("joins the nearest teammates in the snapshot and fades older passes", () => {
    const events = [pass({ time: 10 }, "a", "b", a, b), pass({ time: 14 }, "b", "c", b, c)];
    const lines = chainLines(events, 14, 20, snapshot);
    expect(lines?.team).toBe("home");
    expect(lines?.links.map(({ from, to }) => [from, to])).toEqual([
      [snapshot.players[0], snapshot.players[1]],
      [snapshot.players[1], snapshot.players[2]],
    ]);
    const [older, newer] = lines?.links.map((l) => l.strength) ?? [];
    expect(newer).toBe(1);
    expect(older).toBeLessThan(1);
  });

  it("uses the away half of the snapshot for the away team", () => {
    const events = [pass({ time: 10, team: "away" }, "x", "y", { x: 44, y: 10 }, { x: 48, y: 10 })];
    const lines = chainLines(events, 10, 20, snapshot);
    expect(lines?.links[0]?.from).toEqual(snapshot.players[11]);
    expect(lines?.links[0]?.to).toEqual(snapshot.players[12]);
  });

  it("is undefined without a chain", () => {
    expect(chainLines([], 10, 20, snapshot)).toBeUndefined();
  });
});
