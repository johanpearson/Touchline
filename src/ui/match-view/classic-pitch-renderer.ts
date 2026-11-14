import type { PositionSnapshot } from "../../engine";

export type PitchRendererOptions = {
  homeColour: string;
  awayColour: string;
};

/** What the 2D pitch draws at one moment. */
export type PitchFrame = {
  snapshot: PositionSnapshot;
  score: { home: number; away: number };
};

/** Draws pitch frames. Implemented with canvas 2D; replaceable in tests. */
export type PitchRenderer = {
  resize: (width: number, height: number) => void;
  render: (frame: PitchFrame) => void;
  /** Releases the canvas. */
  dispose: () => void;
};

export type PitchRendererFactory = (
  host: HTMLElement,
  options: PitchRendererOptions,
) => PitchRenderer;
