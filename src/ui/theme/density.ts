export const DENSITIES = ["compact", "comfortable"] as const;

export type Density = (typeof DENSITIES)[number];

export const DEFAULT_DENSITY: Density = "compact";

export const isDensity = (value: unknown): value is Density =>
  typeof value === "string" && (DENSITIES as readonly string[]).includes(value);
