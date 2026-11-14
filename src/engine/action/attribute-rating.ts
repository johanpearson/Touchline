import { type EngineAttributeName, type EnginePlayer, MAX_ENGINE_ATTRIBUTE } from "./engine-player";

/** An attribute scaled to 0..1 (an average 10 gives 0.5). */
export const rating = (player: EnginePlayer, name: EngineAttributeName): number =>
  player.attributes[name] / MAX_ENGINE_ATTRIBUTE;

export const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));
