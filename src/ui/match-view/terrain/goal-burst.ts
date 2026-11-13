import type { Side } from "../../../engine";
import { ASPECT } from "./terrain-grid";

/** A goal effect: a tall spike with a shockwave ring in the scorer's colour. */
export type GoalBurst = { side: Side; x: number; y: number; age: number };

export const BURST_LIFE_SECONDS = 3.4;
export const BURST_PEAK = 4.2;
/** How long the terrain waits after a goal before the pitch resets to kick-off. */
export const GOAL_HOLD_SECONDS = 3.2;
const RISE_SECONDS = 0.35;
const RING_SPEED = 0.55;

/** 0..1 envelope: quick overshoot rise, a short wobble, then a squared fade. */
export const burstEnvelope = (age: number): number => {
  if (age < RISE_SECONDS) {
    const t = age / RISE_SECONDS - 1;
    return 1 + 2.7 * t * t * t + 1.7 * t * t;
  }
  const fallStart = BURST_LIFE_SECONDS * 0.5;
  if (age < fallStart) return 1 + 0.06 * Math.sin(age * 14) * Math.exp(-(age - RISE_SECONDS) * 2);
  const remaining = Math.max(0, 1 - (age - fallStart) / (BURST_LIFE_SECONDS - fallStart));
  return remaining * remaining;
};

const distanceSquared = (burst: GoalBurst, u: number, v: number): number => {
  const dx = u - burst.x;
  const dy = (v - burst.y) * ASPECT;
  return dx * dx + dy * dy;
};

/** Extra height the burst adds at a vertex: a spike plus an outgoing ring. */
export const burstHeight = (burst: GoalBurst, u: number, v: number): number => {
  const d2 = distanceSquared(burst, u, v);
  const spike =
    BURST_PEAK * burstEnvelope(burst.age) * (Math.exp(-d2 / 0.0018) + 0.25 * Math.exp(-d2 / 0.016));
  const gap = Math.sqrt(d2) - burst.age * RING_SPEED;
  const ring = 0.7 * Math.exp(-burst.age * 1.1) * Math.exp((-gap * gap) / 0.0025);
  return spike + ring;
};

/** Pulls a vertex's away share towards the scorer's side inside the ring. Returns the new share. */
export const burstColourShare = (
  burst: GoalBurst,
  u: number,
  v: number,
  awayShare: number,
): number => {
  const gap = Math.sqrt(distanceSquared(burst, u, v)) - burst.age * RING_SPEED;
  const fade = Math.max(0, 1 - burst.age / BURST_LIFE_SECONDS);
  const weight = (gap < 0 ? 1 : Math.exp((-gap * gap) / 0.004)) * fade * 0.9;
  return awayShare + ((burst.side === "home" ? 0 : 1) - awayShare) * weight;
};

/** Opacity of the full-view flash `age` seconds after a goal. */
export const flashAlpha = (age: number, reducedMotion: boolean): number => {
  if (reducedMotion) return 0;
  return 0.55 * Math.max(0, 1 - age / 2.4);
};
