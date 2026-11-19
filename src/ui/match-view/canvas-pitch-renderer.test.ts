import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createCanvasPitchRenderer } from "./canvas-pitch-renderer";

const frame = {
  snapshot: {
    ball: { x: 52.5, y: 34 },
    players: Array.from({ length: 22 }, (_, i) => ({ x: 5 + i * 4, y: 10 + i })),
  },
};

describe("createCanvasPitchRenderer", () => {
  const context = {
    clearRect: vi.fn(),
    fillRect: vi.fn(),
    strokeRect: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    fillText: vi.fn(),
    setTransform: vi.fn(),
  };
  let host: HTMLElement;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
      context as unknown as CanvasRenderingContext2D,
    );
    host = document.createElement("div");
  });
  afterEach(() => vi.restoreAllMocks());

  it("adds a canvas to the host and removes it on dispose", () => {
    const renderer = createCanvasPitchRenderer(host, { homeColour: "#f00", awayColour: "#00f" });
    expect(host.querySelector("canvas")).not.toBeNull();
    renderer.dispose();
    expect(host.querySelector("canvas")).toBeNull();
  });

  it("draws nothing before it has a size", () => {
    const renderer = createCanvasPitchRenderer(host, { homeColour: "#f00", awayColour: "#00f" });
    renderer.render(frame);
    expect(context.fillRect).not.toHaveBeenCalled();
  });

  it("draws the pitch, 22 numbered players, the ball", () => {
    const renderer = createCanvasPitchRenderer(host, { homeColour: "#f00", awayColour: "#00f" });
    renderer.resize(800, 500);
    renderer.render(frame);
    const labels = context.fillText.mock.calls.map((call) => call[0]);
    expect(labels).toContain("1");
    expect(labels.filter((label) => label === "11")).toHaveLength(2);
    expect(context.fillRect).toHaveBeenCalled();
  });

  it("draws no score text, since the scoreboard shows the score", () => {
    const renderer = createCanvasPitchRenderer(host, { homeColour: "#f00", awayColour: "#00f" });
    renderer.resize(800, 500);
    const withStaleScore = { ...frame, score: { home: 2, away: 1 } };
    renderer.render(withStaleScore);
    const labels = context.fillText.mock.calls.map((call) => String(call[0]));
    expect(labels.filter((label) => /\d+\s*[–-]\s*\d+/.test(label))).toEqual([]);
  });

  it("redraws the last frame when resized", () => {
    const renderer = createCanvasPitchRenderer(host, { homeColour: "#f00", awayColour: "#00f" });
    renderer.resize(800, 500);
    renderer.render(frame);
    context.fillRect.mockClear();
    renderer.resize(400, 250);
    expect(context.fillRect).toHaveBeenCalled();
  });
});
