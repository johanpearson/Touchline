import type { MatchEvent } from "../../../engine";
import { flashAlpha } from "./goal-burst";
import type { Rgb } from "./terrain-colour";
import { VERTEX_COUNT } from "./terrain-grid";
import { consumeEvents, createTerrainState, resetTerrain, stepDynamics } from "./terrain-state";
import { composeSurface, updateSurface } from "./terrain-surface";

/** What a renderer draws for one frame. The arrays are reused between frames. */
export type TerrainFrame = {
  height: Float32Array;
  awayShare: Float32Array;
  /** Camera shake in seconds remaining, 0 when still. */
  shake: number;
  /** Wall-clock seconds, for idle camera sway. */
  time: number;
  /** Goal flash: opacity and the scoring side, or null. */
  flash: { alpha: number; side: "home" | "away" } | null;
};

export type TerrainInput = {
  events: readonly MatchEvent[];
  /** Match time in seconds that the terrain should show. */
  matchTime: number;
  /** Seconds of real time since the previous frame. */
  wallSeconds: number;
  /** Wall-clock seconds. */
  time: number;
  reducedMotion: boolean;
};

export type TerrainDriver = { frame: (input: TerrainInput) => TerrainFrame };

export type { Rgb };

/** Runs the terrain model one frame at a time from the event log and the current match time. */
export const createTerrainDriver = (): TerrainDriver => {
  const state = createTerrainState();
  const frame: TerrainFrame = {
    height: new Float32Array(VERTEX_COUNT),
    awayShare: new Float32Array(VERTEX_COUNT),
    shake: 0,
    time: 0,
    flash: null,
  };
  let lastMatchTime = 0;

  return {
    frame: ({ events, matchTime, wallSeconds, time, reducedMotion }) => {
      if (matchTime < lastMatchTime) resetTerrain(state);
      const matchSeconds = matchTime - lastMatchTime;
      lastMatchTime = matchTime;

      consumeEvents(state, events, matchTime, reducedMotion);
      stepDynamics(state, wallSeconds, matchSeconds);
      updateSurface(state, wallSeconds, time);
      composeSurface(state, time, reducedMotion, frame.height, frame.awayShare);

      const alpha = state.sinceGoal === null ? 0 : flashAlpha(state.sinceGoal, reducedMotion);
      frame.flash = state.scorer && alpha > 0 ? { alpha, side: state.scorer } : null;
      frame.shake = state.shake;
      frame.time = time;
      return frame;
    },
  };
};
