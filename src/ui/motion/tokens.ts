/** Durations in seconds, as Motion expects them. */
export const DURATION = { fast: 0.12, base: 0.2, slow: 0.32 } as const;

/** Easings: calm and short, in the "Floodlight" spirit. */
export const EASE = {
  out: [0.22, 1, 0.36, 1],
  inOut: [0.65, 0, 0.35, 1],
} as const satisfies Record<string, readonly [number, number, number, number]>;

/** Distance of the slide used by route and overlay entrances, in pixels. */
export const SLIDE_PX = 8;
