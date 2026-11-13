import type { TerrainFrame } from "./terrain-driver";

export type TerrainRendererOptions = {
  homeColour: string;
  awayColour: string;
  reducedMotion: boolean;
};

/** Draws terrain frames. Implemented with three.js; replaceable in tests. */
export type TerrainRenderer = {
  resize: (width: number, height: number) => void;
  render: (frame: TerrainFrame) => void;
  /** Releases the canvas, GPU resources and listeners. */
  dispose: () => void;
};

export type TerrainRendererFactory = (
  host: HTMLElement,
  options: TerrainRendererOptions,
) => TerrainRenderer | Promise<TerrainRenderer>;
