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
});
