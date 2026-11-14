import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ActionEvent, PositionSnapshot } from "../../engine";
import { ClassicPitch } from "./classic-pitch";
import type { PitchRenderer } from "./classic-pitch-renderer";

const snapshotAt = (x: number): PositionSnapshot => ({
  ball: { x, y: 34 },
  players: Array.from({ length: 22 }, (_, i) => ({ x: x + i, y: 10 + i })),
});

const carry = (time: number, x: number): ActionEvent => ({
  type: "carry",
  time,
  period: "firstHalf",
  team: "home",
  actor: "h1",
  from: { x, y: 30 },
  to: { x, y: 30 },
  pressure: 0,
  outcome: "kept",
  snapshot: snapshotAt(x),
});

const fakeRenderer = () => {
  const renderer: PitchRenderer = { resize: vi.fn(), render: vi.fn(), dispose: vi.fn() };
  return { renderer, factory: vi.fn(() => renderer) };
};

describe("ClassicPitch", () => {
  let frames: FrameRequestCallback[];

  beforeEach(() => {
    frames = [];
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => frames.push(cb));
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  const props = {
    events: [carry(10, 20), carry(20, 40)],
    matchTime: 15,
    score: { home: 1, away: 0 },
    homeColour: "#f00",
    awayColour: "#00f",
    label: "Pitch",
    setPieceLabels: {
      kickoff: "Kick-off",
      throwIn: "Throw-in",
      goalKick: "Goal kick",
      corner: "Corner",
      freeKick: "Free kick",
      penalty: "Penalty",
    },
  };
  const runFrame = () => act(() => frames.at(-1)?.(0));

  it("draws the interpolated snapshot and the score each frame", () => {
    const { renderer, factory } = fakeRenderer();
    render(<ClassicPitch {...props} createRenderer={factory} />);
    runFrame();
    expect(factory).toHaveBeenCalledWith(expect.anything(), {
      homeColour: "#f00",
      awayColour: "#00f",
    });
    const frame = vi.mocked(renderer.render).mock.calls[0]?.[0];
    expect(frame?.snapshot.ball).toEqual({ x: 30, y: 34 });
    expect(frame?.score).toEqual({ home: 1, away: 0 });
  });

  it("follows the match time without recreating the renderer", () => {
    const { renderer, factory } = fakeRenderer();
    const view = render(<ClassicPitch {...props} createRenderer={factory} />);
    view.rerender(<ClassicPitch {...props} matchTime={20} createRenderer={factory} />);
    runFrame();
    expect(vi.mocked(renderer.render).mock.calls[0]?.[0].snapshot.ball.x).toBe(40);
    expect(factory).toHaveBeenCalledTimes(1);
  });

  it("draws nothing when the log has no snapshots", () => {
    const { renderer, factory } = fakeRenderer();
    render(<ClassicPitch {...props} events={[]} createRenderer={factory} />);
    runFrame();
    expect(renderer.render).not.toHaveBeenCalled();
  });

  it("disposes the renderer on unmount", () => {
    const { renderer, factory } = fakeRenderer();
    render(<ClassicPitch {...props} createRenderer={factory} />).unmount();
    expect(renderer.dispose).toHaveBeenCalled();
  });

  it("is labelled for assistive technology", () => {
    const { factory } = fakeRenderer();
    const view = render(<ClassicPitch {...props} createRenderer={factory} />);
    expect(view.getByRole("img").getAttribute("aria-label")).toBe("Pitch");
  });

  describe("overlays", () => {
    const players = Array.from({ length: 22 }, (_, i) => ({ x: 10 + i * 3, y: 20 }));
    const snapshot: PositionSnapshot = { ball: { x: 10, y: 20 }, players };
    const common = { period: "firstHalf" as const, pressure: 0, snapshot };
    const pass = (time: number, from: number, to: number, outcome = "complete") =>
      ({
        ...common,
        type: "pass",
        variant: "short",
        outcome,
        time,
        team: "home",
        actor: `h${from}`,
        target: `h${to}`,
        from: players[from],
        to: players[to],
      }) as ActionEvent;
    const setPiece = (time: number, variant: string, team: "home" | "away", slot: number) =>
      ({
        ...common,
        type: "setPiece",
        variant,
        outcome: "taken",
        time,
        team,
        actor: "t",
        from: players[slot],
        to: players[slot],
      }) as ActionEvent;
    const frameOf = (events: ActionEvent[], matchTime: number, showChain = true) => {
      const { renderer, factory } = fakeRenderer();
      render(
        <ClassicPitch
          {...props}
          events={events}
          matchTime={matchTime}
          showChain={showChain}
          createRenderer={factory}
        />,
      );
      runFrame();
      return vi.mocked(renderer.render).mock.calls[0]?.[0];
    };

    it("draws the passing chain between the passers' positions", () => {
      const frame = frameOf([pass(10, 1, 2), pass(12, 2, 3)], 12);
      expect(frame?.chain?.team).toBe("home");
      expect(frame?.chain?.links.map((l) => [l.from, l.to])).toEqual([
        [players[1], players[2]],
        [players[2], players[3]],
      ]);
    });

    it("draws no chain when it is toggled off", () => {
      expect(frameOf([pass(10, 1, 2)], 10, false)?.chain).toBeUndefined();
    });

    it("draws a shorter chain after an interception broke it", () => {
      const frame = frameOf([pass(10, 1, 2), pass(12, 2, 3, "intercepted"), pass(14, 3, 4)], 14);
      expect(frame?.chain?.links).toHaveLength(1);
    });

    it("shows the corner set-up with its taker and label", () => {
      const frame = frameOf([setPiece(10, "corner", "home", 7), pass(14, 7, 8)], 11);
      expect(frame?.setPiece).toEqual({ taker: 7, team: "home", label: "Corner" });
      expect(frame?.snapshot).toEqual(snapshot);
    });

    it("shows the penalty set-up for the away team", () => {
      const frame = frameOf([setPiece(10, "penalty", "away", 15)], 11);
      expect(frame?.setPiece).toEqual({ taker: 15, team: "away", label: "Penalty" });
    });

    it("shows no set-up once the first action has been taken", () => {
      const frame = frameOf([setPiece(10, "corner", "home", 7), pass(14, 7, 8)], 14);
      expect(frame?.setPiece).toBeUndefined();
    });
  });
});
