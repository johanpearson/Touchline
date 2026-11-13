import { useEffect, useRef } from "react";
import type { MatchEvent } from "../../engine";
import { createTerrainDriver } from "./terrain/terrain-driver";
import {
  createDefaultRenderer,
  type TerrainRenderer,
  type TerrainRendererFactory,
} from "./terrain-renderer";

export type MomentumTerrainProps = {
  /** The match event log. The terrain only reads it. */
  events: readonly MatchEvent[];
  /** Match time in seconds to show. */
  matchTime: number;
  homeColour: string;
  awayColour: string;
  /** Overrides the user's `prefers-reduced-motion` setting. */
  reducedMotion?: boolean;
  /** Replaces the three.js renderer, for tests. */
  createRenderer?: TerrainRendererFactory;
  label: string;
};

const prefersReducedMotion = (): boolean =>
  typeof window.matchMedia === "function" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** The animated momentum terrain: height shows pressure, colour shows which team dominates. */
export function MomentumTerrain({
  events,
  matchTime,
  homeColour,
  awayColour,
  reducedMotion,
  createRenderer = createDefaultRenderer,
  label,
}: MomentumTerrainProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const flashRef = useRef<HTMLDivElement>(null);
  const latest = useRef({ events, matchTime });
  latest.current = { events, matchTime };

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const reduced = reducedMotion ?? prefersReducedMotion();
    const driver = createTerrainDriver();
    const colours: Record<"home" | "away", string> = { home: homeColour, away: awayColour };
    let renderer: TerrainRenderer | null = null;
    let disposed = false;
    let frameId = 0;
    let last = performance.now();

    const resize = () => renderer?.resize(host.clientWidth, host.clientHeight);
    const observer = typeof ResizeObserver === "function" ? new ResizeObserver(resize) : null;
    observer?.observe(host);

    const loop = (now: number) => {
      const wallSeconds = Math.min(0.1, (now - last) / 1000);
      last = now;
      const frame = driver.frame({
        events: latest.current.events,
        matchTime: latest.current.matchTime,
        wallSeconds,
        time: now / 1000,
        reducedMotion: reduced,
      });
      renderer?.render(frame);
      const flash = flashRef.current;
      if (flash) {
        flash.style.opacity = String(frame.flash?.alpha ?? 0);
        const colour = frame.flash ? colours[frame.flash.side] : "transparent";
        flash.style.background = `radial-gradient(circle at 50% 45%, ${colour} 0%, transparent 65%)`;
      }
      frameId = requestAnimationFrame(loop);
    };

    Promise.resolve(createRenderer(host, { homeColour, awayColour, reducedMotion: reduced })).then(
      (created) => {
        if (disposed) {
          created.dispose();
          return;
        }
        renderer = created;
        resize();
      },
    );
    frameId = requestAnimationFrame(loop);

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      observer?.disconnect();
      renderer?.dispose();
      renderer = null;
    };
  }, [homeColour, awayColour, reducedMotion, createRenderer]);

  return (
    <div
      ref={hostRef}
      role="img"
      aria-label={label}
      data-testid="momentum-terrain"
      style={{
        position: "relative",
        width: "100%",
        aspectRatio: "16 / 10",
        touchAction: "pan-y",
        cursor: "grab",
      }}
    >
      <div
        ref={flashRef}
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          opacity: 0,
          mixBlendMode: "screen",
        }}
      />
    </div>
  );
}
