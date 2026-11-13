import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { MatchEvent } from "../../engine";
import { MomentumTerrain } from "./momentum-terrain";
import type { TerrainRenderer, TerrainRendererFactory } from "./terrain-renderer";

const goal: MatchEvent = {
  type: "goal",
  time: 1,
  team: "home",
  position: { x: 0.9, y: 0.5 },
  intensity: 1,
  xg: 0.2,
};

const fakeRenderer = (): TerrainRenderer => ({
  resize: vi.fn(),
  render: vi.fn(),
  dispose: vi.fn(),
});
const flush = () => act(async () => {});

describe("MomentumTerrain", () => {
  let frames: FrameRequestCallback[];

  beforeEach(() => {
    frames = [];
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) =>
      frames.push(callback),
    );
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  const props = {
    events: [goal],
    matchTime: 5,
    homeColour: "#ff4b5c",
    awayColour: "#2f9bff",
    label: "Match view",
  };

  it("draws frames with the renderer it creates", async () => {
    const renderer = fakeRenderer();
    const factory: TerrainRendererFactory = () => renderer;
    render(<MomentumTerrain {...props} createRenderer={factory} />);
    await flush();
    act(() => frames.at(-1)?.(16));
    expect(renderer.render).toHaveBeenCalled();
    expect(renderer.resize).toHaveBeenCalled();
  });

  it("releases the renderer when unmounted", async () => {
    const renderer = fakeRenderer();
    const { unmount } = render(<MomentumTerrain {...props} createRenderer={() => renderer} />);
    await flush();
    unmount();
    expect(renderer.dispose).toHaveBeenCalledTimes(1);
    expect(cancelAnimationFrame).toHaveBeenCalled();
  });

  it("releases a renderer that finishes loading after unmount", async () => {
    const renderer = fakeRenderer();
    let finish: (value: TerrainRenderer) => void = () => {};
    const factory: TerrainRendererFactory = () => new Promise((resolve) => (finish = resolve));
    const { unmount } = render(<MomentumTerrain {...props} createRenderer={factory} />);
    unmount();
    finish(renderer);
    await flush();
    expect(renderer.dispose).toHaveBeenCalledTimes(1);
  });

  it("passes the reduced-motion preference to the renderer", async () => {
    const factory = vi.fn<TerrainRendererFactory>(() => fakeRenderer());
    render(<MomentumTerrain {...props} reducedMotion createRenderer={factory} />);
    await flush();
    expect(factory.mock.calls[0]?.[1]).toMatchObject({ reducedMotion: true });
  });

  it("follows the user's prefers-reduced-motion setting by default", async () => {
    vi.stubGlobal("matchMedia", () => ({ matches: true }));
    const factory = vi.fn<TerrainRendererFactory>(() => fakeRenderer());
    render(<MomentumTerrain {...props} createRenderer={factory} />);
    await flush();
    expect(factory.mock.calls[0]?.[1]).toMatchObject({ reducedMotion: true });
  });

  it("flashes the view in the scoring team's colour after a goal", async () => {
    const { getByTestId } = render(
      <MomentumTerrain {...props} createRenderer={() => fakeRenderer()} />,
    );
    await flush();
    act(() => frames.at(-1)?.(16));
    const flash = getByTestId("momentum-terrain").firstElementChild as HTMLElement;
    expect(Number(flash.style.opacity)).toBeGreaterThan(0);
  });

  it("describes the view for assistive technology", () => {
    const { getByRole } = render(
      <MomentumTerrain {...props} createRenderer={() => fakeRenderer()} />,
    );
    expect(getByRole("img").getAttribute("aria-label")).toBe("Match view");
  });
});
