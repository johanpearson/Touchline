import type { PositionSnapshot, Side } from "../../engine";
import type { ChainLink } from "./passing-chain";

export type PitchRendererOptions = {
  homeColour: string;
  awayColour: string;
};

/** What the 2D pitch draws at one moment. */
export type PitchFrame = {
  snapshot: PositionSnapshot;
  /** The recent passing chain of the team in possession, oldest link first. */
  chain?: { team: Side; links: readonly ChainLink[] };
  /** Set while a set piece is being set up: the taker's snapshot slot and a short label. */
  setPiece?: { team: Side; taker: number; label: string };
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
