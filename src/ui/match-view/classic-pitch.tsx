import { useEffect, useRef } from "react";
import type { ActionEvent, MatchState } from "../../engine";
import { createCanvasPitchRenderer } from "./canvas-pitch-renderer";
import type { PitchRendererFactory } from "./classic-pitch-renderer";
import { interpolateSnapshot } from "./interpolate-snapshot";

export type ClassicPitchProps = {
  /** The action event log. The pitch only reads it. */
  events: readonly ActionEvent[];
  /** Match time in seconds to show. */
  matchTime: number;
  score: MatchState["score"];
  homeColour: string;
  awayColour: string;
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
  createRenderer = createCanvasPitchRenderer,
  label,
}: ClassicPitchProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const latest = useRef({ events, matchTime, score });
  latest.current = { events, matchTime, score };

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
      const { events: log, matchTime: time, score: current } = latest.current;
      const snapshot = interpolateSnapshot(log, time);
      if (snapshot) renderer.render({ snapshot, score: current });
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
