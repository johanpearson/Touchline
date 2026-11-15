import { useEffect, useRef } from "react";
import type { ActionEvent, ActionMatchState, SetPieceEvent } from "../../engine";
import { createCanvasPitchRenderer } from "./canvas-pitch-renderer";
import type { PitchRendererFactory } from "./classic-pitch-renderer";
import { interpolateSnapshot } from "./interpolate-snapshot";
import { chainLines } from "./passing-chain";
import { activeSetPiece } from "./set-piece-setup";

/** How many seconds back the passing chain reaches. */
export const CHAIN_WINDOW_SECONDS = 20;

export type ClassicPitchProps = {
  /** The action event log. The pitch only reads it. */
  events: readonly ActionEvent[];
  /** Match time in seconds to show. */
  matchTime: number;
  score: ActionMatchState["score"];
  homeColour: string;
  awayColour: string;
  /** Whether the passing chain is drawn. */
  showChain?: boolean;
  /** The short label shown while each kind of set piece is set up. */
  setPieceLabels: Readonly<Record<SetPieceEvent["variant"], string>>;
  /** Replaces the canvas renderer, for tests. */
  createRenderer?: PitchRendererFactory;
  label: string;
};

/** A flat 2D pitch with both teams and the ball, drawn from the engine's position snapshots. */
export function ClassicPitch({
  events,
  matchTime,
  score,
  homeColour,
  awayColour,
  showChain = true,
  setPieceLabels,
  createRenderer = createCanvasPitchRenderer,
  label,
}: ClassicPitchProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const latest = useRef({ events, matchTime, score, showChain, setPieceLabels });
  latest.current = { events, matchTime, score, showChain, setPieceLabels };

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const renderer = createRenderer(host, { homeColour, awayColour });
    const resize = () => renderer.resize(host.clientWidth, host.clientHeight);
    const observer = typeof ResizeObserver === "function" ? new ResizeObserver(resize) : null;
    observer?.observe(host);
    resize();
    let frameId = 0;
    const loop = () => {
      const { events: log, matchTime: time, score: current, ...shown } = latest.current;
      const snapshot = interpolateSnapshot(log, time);
      if (snapshot) {
        const setPiece = activeSetPiece(log, time);
        renderer.render({
          snapshot,
          score: current,
          chain: shown.showChain
            ? chainLines(log, time, CHAIN_WINDOW_SECONDS, snapshot)
            : undefined,
          setPiece: setPiece && {
            team: setPiece.team,
            taker: setPiece.taker,
            label: shown.setPieceLabels[setPiece.variant],
          },
        });
      }
      frameId = requestAnimationFrame(loop);
    };
    frameId = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(frameId);
      observer?.disconnect();
      renderer.dispose();
    };
  }, [homeColour, awayColour, createRenderer]);

  return (
    <div
      ref={hostRef}
      role="img"
      aria-label={label}
      data-testid="classic-pitch"
      style={{ position: "relative", width: "100%", aspectRatio: "16 / 10" }}
    />
  );
}
